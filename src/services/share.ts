import { getProvider } from "../data";
import { Share } from "../types/entity";

const provider = getProvider();
const { findSharesByClaimedUserId, findShareById } = provider;

// service

export async function fetchSharesByClaimedUserId(
  userID: string
): Promise<Share[]> {
  return findSharesByClaimedUserId(userID);
}

export async function fetchShareById(
  shareId: string
): Promise<Share | undefined> {
  return findShareById(shareId);
}
