// Coins for the main farm after a server-verified challenge submit.
// Limits: participation is paid once per week; placement pays only the difference when the
// verified rank improves, so one week can never pay more than participation + 1st place.
// The ledger is local (the game is offline and not monetized), keyed by challenge id.

export const CHALLENGE_REWARD = {
  participation: 120,
  placement: (rank: number): number => (rank <= 1 ? 400 : rank <= 3 ? 250 : rank <= 10 ? 120 : rank <= 50 ? 50 : 0)
}

export interface RewardLedger { participation: boolean, placementPaid: number }

export function rewardDue(prev: RewardLedger | undefined, rank: number): { coins: number, ledger: RewardLedger } {
  const ledger: RewardLedger = prev ? { ...prev } : { participation: false, placementPaid: 0 }
  let coins = 0
  if (!ledger.participation) {
    coins += CHALLENGE_REWARD.participation
    ledger.participation = true
  }
  const placement = Number.isInteger(rank) && rank > 0 ? CHALLENGE_REWARD.placement(rank) : 0
  if (placement > ledger.placementPaid) {
    coins += placement - ledger.placementPaid
    ledger.placementPaid = placement
  }
  return { coins, ledger }
}
