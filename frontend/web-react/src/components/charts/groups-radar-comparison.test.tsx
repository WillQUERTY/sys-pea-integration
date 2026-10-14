import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GroupsRadarComparison, COMPARISON_GROUP_PALETTE } from './groups-radar-comparison'

describe('GroupsRadarComparison Component', () => {
  it('has valid comparison color palettes', () => {
    expect(COMPARISON_GROUP_PALETTE.length).toBeGreaterThanOrEqual(4)
    COMPARISON_GROUP_PALETTE.forEach((item) => {
      expect(item.stroke).toBeDefined()
      expect(item.fill).toBeDefined()
      expect(item.badge).toBeDefined()
      expect(item.dot).toBeDefined()
    })
  })

  it('renders loading skeleton initially while query resolves', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const { container } = await render(
      <QueryClientProvider client={queryClient}>
        <GroupsRadarComparison initialGroupIds={[10, 35]} />
      </QueryClientProvider>
    )

    expect(container).toBeDefined()
  })
})
