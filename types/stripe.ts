export interface PlanPrice {
  id: string
  unit_amount: number | null
}

export interface PlanProduct {
  id: string
  name: string
  description: string | null
  metadata: Record<string, string>
  prices: PlanPrice[]
}
