import { getProvider } from "../data";
import { Share } from "../types/entity";

const data = getProvider();
const { findSharesByClaimedUserId } = data;

// service

export async function fetchSharesByClaimedUserId(
  userID: string
): Promise<Share[]> {
  return findSharesByClaimedUserId(userID);
}
