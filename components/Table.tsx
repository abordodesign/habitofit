import { CheckIcon } from "@heroicons/react/24/outline"
import { PlanProduct } from "@/types/stripe"

const planDetailsByName: Record<
  string,
  { videoQuality: string; duration: string; resolution: string }
> = {
  'plano básico': { videoQuality: 'HD', duration: 'Mensal', resolution: '720p' },
  'plano pro': { videoQuality: 'Full HD', duration: 'Mensal', resolution: '1080p' },
  'plano premium': { videoQuality: '4K', duration: 'Mensal', resolution: '4K' },
}

const getPlanDetails = (product: PlanProduct) => {
  const key = product.name.trim().toLowerCase()
  return (
    planDetailsByName[key] ?? {
      videoQuality: '-',
      duration: '-',
      resolution: '-',
    }
  )
}


interface Props{
    products: PlanProduct[]
    selectedPlan: PlanProduct | null
  }

function Table({products , selectedPlan}: Props) {
  return (
    <table>
        <tbody className="divide-y divide-[#DF9DC0]">
            <tr className="tableRow">
                <td className="tableDataTitle">Preço</td>
                {products.map((product) =>(
                    <td key={product.id} className={`tableDataFeature ${selectedPlan?.id === product.id ? 'text-[#DF9DC0]' : 'text-[gray]'}`} >
                        R$ {product.prices[0].unit_amount! / 100}
                    </td>
                ))}
            </tr>
            <tr className="tableRow">
                <td className="tableDataTitle">Qualidade do video</td>
                {products.map((product) =>(
                    <td key={product.id} className={`tableDataFeature ${selectedPlan?.id === product.id ? 'text-[#DF9DC0]' : 'text-[gray]'}`} >
                        {getPlanDetails(product).videoQuality}
                    </td>
                ))}
            </tr>
            <tr className="tableRow">
                <td className="tableDataTitle">Tempo de assinatura</td>
                {products.map((product) =>(
                    <td key={product.id} className={`tableDataFeature ${selectedPlan?.id === product.id ? 'text-[#DF9DC0]' : 'text-[gray]'}`} >
                        {getPlanDetails(product).duration}
                    </td>
                ))}
            </tr>

            <tr className="tableRow">
          <td className="tableDataTitle">Resolução</td>
          {products.map((product) => (
            <td
              className={`tableDataFeature ${
                selectedPlan?.id === product.id
                  ? 'text-[#DF9DC0]'
                  : 'text-[gray]'
              }`}
              key={product.id}
            >
              {getPlanDetails(product).resolution}
            </td>
          ))}
        </tr>

        {/* <tr className="tableRow">
          <td className="tableDataTitle">
            Watch on your TV, computer, mobile phone and tablet
          </td>
          {products.map((product) => (
            <td
              className={`tableDataFeature ${
                selectedPlan?.id === product.id
                  ? 'text-[#E50914]'
                  : 'text-[gray]'
              }`}
              key={product.id}
            >
              {product.metadata.portability === 'true' && (
                <CheckIcon className="inline-block h-8 w-8" />
              )}
            </td>
          ))}
        </tr> */}
        </tbody>
    </table>
  )
}

export default Table
