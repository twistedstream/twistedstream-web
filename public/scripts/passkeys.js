function arrayBufferFromBase64Url(from) {
  return Base64.toUint8Array(from);
}

function base64UrlFromArrayBuffer(from) {
  return Base64.fromUint8Array(new Uint8Array(from), true);
}

function arePasskeysSupported() {
  const supported =
    getQueryParam("no_passkeys") === null &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function";

  console.log("Passkeys supported:", supported);
  return supported;
}

async function isPasskeyAutofillSupported() {
  const supported =
    getQueryParam("no_autofill") === null &&
    arePasskeysSupported &&
    (await PublicKeyCredential.isConditionalMediationAvailable());

  console.log("Passkey autofill supported:", supported);
  return supported;
}

async function registerUser(username, displayName, authenticatorAttachment) {
  // build options request
  const attestationOptionsRequest = {
    username,
    displayName,
    authenticatorSelection: {
      requireResidentKey: false,
      residentKey: "preferred",
      authenticatorAttachment,
      userVerification: "preferred",
    },
    attestation: "direct",
  };
  console.log("attestationOptionsRequest:", attestationOptionsRequest);

  // obtain registration challenge from rp
  const attestationOptionsFetchResponse = await fetch(
    "/fido2/attestation/options",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(attestationOptionsRequest),
    }
  );
  const attestationOptionsResponse =
    await attestationOptionsFetchResponse.json();
  console.log("attestationOptionsResponse:", attestationOptionsResponse);
  if (
    !attestationOptionsFetchResponse.ok ||
    attestationOptionsResponse.status !== "ok"
  ) {
    throw attestationOptionsResponse.errorMessage;
  }

  // build credential creation options
  const credentialCreationOptions = {
    publicKey: {
      ...attestationOptionsResponse,
      user: {
        ...attestationOptionsResponse.user,
        id: arrayBufferFromBase64Url(attestationOptionsResponse.user.id),
      },
      challenge: arrayBufferFromBase64Url(attestationOptionsResponse.challenge),
      excludeCredentials: attestationOptionsResponse.excludeCredentials.map(
        (c) => ({
          ...c,
          id: arrayBufferFromBase64Url(c.id),
        })
      ),
    },
  };
  console.log("credentialCreationOptions:", credentialCreationOptions);

  // create public key credential (via the browser)
  let credentialsCreationResult;
  try {
    credentialsCreationResult = await navigator.credentials.create(
      credentialCreationOptions
    );
  } catch (err) {
    if (err.name === "NotAllowedError") {
      return console.warn("User cancelled:", err);
    }
    if (err.name === "InvalidStateError") {
      console.warn("Already registered this credential:", err);
      throw new Error(
        "Hmm, looks like you already registered with this credential"
      );
    }
    console.error("Credential creation error:", err);
    throw err;
  }
  console.log("credentialsCreationResult:", credentialsCreationResult);

  // build result request
  const attestationResultRequest = {
    id: credentialsCreationResult.id,
    rawId: base64UrlFromArrayBuffer(credentialsCreationResult.rawId),
    response: {
      clientDataJSON: base64UrlFromArrayBuffer(
        credentialsCreationResult.response.clientDataJSON
      ),
      attestationObject: base64UrlFromArrayBuffer(
        credentialsCreationResult.response.attestationObject
      ),
    },
    type: "public-key",
  };
  console.log("attestationResultRequest:", attestationResultRequest);

  // validate registration with rp
  const attestationResultFetchResponse = await fetch(
    "/fido2/attestation/result",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(attestationResultRequest),
    }
  );
  const attestationResultResponse = await attestationResultFetchResponse.json();
  console.log("attestationResultResponse:", attestationResultResponse);
  if (
    !attestationResultFetchResponse.ok ||
    attestationResultResponse.status !== "ok"
  ) {
    throw attestationResultResponse;
  }

  return attestationResultResponse.return_to;
}

async function authenticateUser(arg) {
  let username = "";
  let abortController;

  if (typeof arg === "string") {
    username = arg;
  } else {
    abortController = arg;
  }

  // build options request
  const assertionOptionsRequest = {
    username,
    userVerification: "preferred",
  };
  console.log("assertionOptionsRequest:", assertionOptionsRequest);

  // obtain assertion challenge from rp
  const assertionOptionsFetchResponse = await fetch(
    "/fido2/assertion/options",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(assertionOptionsRequest),
    }
  );
  const assertionOptionsResponse = await assertionOptionsFetchResponse.json();
  console.log("assertionOptionsResponse:", assertionOptionsResponse);
  if (!assertionOptionsFetchResponse.ok) {
    throw assertionOptionsResponse;
  }

  // build credential authentication options
  const credentialGetOptions = {
    publicKey: {
      ...assertionOptionsResponse,
      allowCredentials: assertionOptionsResponse.allowCredentials.map((c) => ({
        ...c,
        id: arrayBufferFromBase64Url(c.id),
      })),
      challenge: arrayBufferFromBase64Url(assertionOptionsResponse.challenge),
    },
  };
  // autofill support
  if (abortController) {
    credentialGetOptions.mediation = "conditional";
    credentialGetOptions.signal = abortController.signal;
  }
  console.log("credentialGetOptions:", credentialGetOptions);

  // get public key credential (via the browser)
  let credentialGetResult;
  try {
    credentialGetResult = await navigator.credentials.get(credentialGetOptions);
  } catch (err) {
    if (err.name === "NotAllowedError") {
      return console.warn("User cancelled:", err);
    }
    if (err.name === "AbortError") {
      return console.warn("Autofill sign-in aborted:", err);
    }

    console.error("Credential get error:", err);
    throw err;
  }
  console.log("credentialGetResult:", credentialGetResult);

  // build result request
  const assertionResultRequest = {
    id: credentialGetResult.id,
    rawId: base64UrlFromArrayBuffer(credentialGetResult.rawId),
    type: "public-key",
    response: {
      clientDataJSON: base64UrlFromArrayBuffer(
        credentialGetResult.response.clientDataJSON
      ),
      authenticatorData: base64UrlFromArrayBuffer(
        credentialGetResult.response.authenticatorData
      ),
      signature: base64UrlFromArrayBuffer(
        credentialGetResult.response.signature
      ),
      userHandle: base64UrlFromArrayBuffer(
        credentialGetResult.response.userHandle
      ),
    },
  };
  console.log("assertionResultRequest:", assertionResultRequest);

  // validate authentication with rp
  const assertionResultFetchResponse = await fetch("/fido2/assertion/result", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(assertionResultRequest),
  });
  const assertionResultResponse = await assertionResultFetchResponse.json();
  console.log("assertionResultResponse:", assertionResultResponse);
  if (!assertionResultFetchResponse.ok) {
    throw assertionResultResponse;
  }

  return assertionResultResponse.return_to;
}
