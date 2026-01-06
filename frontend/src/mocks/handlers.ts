import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('http://localhost:8000/api/v1/accounts', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Mock Account',
        assets: [],
        cash: 0,
        total_asset_value: 0,
        total_invested_value: 0,
        total_pl_amount: 0,
        total_pl_rate: 0
      }
    ])
  }),
]
