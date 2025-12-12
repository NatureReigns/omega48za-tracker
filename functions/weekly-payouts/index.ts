// From earlier – automated Friday payouts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (_req) => {
  const friday = new Date()
  if (friday.getDay() !== 5) return new Response("Only runs on Friday")

  const { data: agents } = await supabase.from('profiles').select('*').in('role', ['agent'])

  for (const agent of agents!) {
    const { data: weekSales } = await supabase
      .from('sales')
      .select('amount_zar')
      .eq('agent_id', agent.id)
      .gte('sale_date', new Date(Date.now() - 7*24*60*60*1000))

    const totalSales = weekSales?.reduce((sum, s) => sum + Number(s.amount_zar), 0) || 0

    const commission = totalSales * 0.30
    const stockAlloc = totalSales * 0.50

    if (commission > 10) {
      const { data: payout } = await supabase
        .from('payouts')
        .insert({
          agent_id: agent.id,
          period_ending: new Date(),
          commission_zar: commission,
          stock_allocation_zar: stockAlloc
        })
        .select()
        .single()

      // Placeholder for PayShap API
      // const pineResponse = await fetch('https://api.pineapple.co.za/v1/payments', { ... })

      await supabase
        .from('payouts')
        .update({ payshap_status: 'paid' })
        .eq('id', payout.id)
    }
  }

  return new Response("Weekly payouts processed")
})
