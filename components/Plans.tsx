import useAuth from "@/hooks/useAuth";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { PlanProduct } from "@/types/stripe";
import Head from "next/head";
import Link from "next/link";
import Table from "./Table";
import Loader from "./Loader";
import { createCheckout } from "@/utils/createCheckout";

interface Props {
  products: PlanProduct[];
}

function Plans({ products }: Props) {
  const { logout, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanProduct | null>(
    products[2] ?? null
  );
  const [isBillingLoading, setIsBillingLoading] = useState(false);

  const subscribeToPlan = async () => {
    if (!user || !selectedPlan) return;
    if (!selectedPlan.prices?.length) {
      console.error("Plano sem preço ativo no Stripe.");
      return;
    }
  
    try {
      if (!user.email) {
        throw new Error("O e-mail do usuário não está disponível.");
      }
      setIsBillingLoading(true);
      // Passando user.email (garantido que não seja null) para a função createCheckout
      await createCheckout(selectedPlan.prices[0].id, user.uid, user.email);
    } catch (error) {
      console.error("Erro ao tentar iniciar o checkout:", error);
      setIsBillingLoading(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Netflix Design</title>
      </Head>

      <header className="border-b border-[#DF9DC0]/70 bg-[#141414]">
        <Link href="/">
          <img
            src="logo-login.svg"
            alt="Habito"
            className="cursor-pointer object-contain w-[200px]"
          />
        </Link>
        <button
          className="text-lg font-medium hover:underline"
          onClick={logout}
        >
          Sair
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-40 pb-12 transition-all md:px-5">
        <h1 className="mb-3 text-5xl font-medium">Escolha seu plano</h1>
        <ul>
          <li className="flex items-center gap-x-2 text-lg">
            <CheckIcon className="h-7 w-7 text-[#DF9DC0]" /> Conteúdo completo e
            exclusivo
          </li>
          <li className="flex items-center gap-x-2 text-lg">
            <CheckIcon className="h-7 w-7 text-[#DF9DC0]" /> Crie sua lista
            personalizada
          </li>
          <li className="flex items-center gap-x-2 text-lg">
            <CheckIcon className="h-7 w-7 text-[#DF9DC0]" /> Mude ou cancele seu
            plano a qualquer momento
          </li>
        </ul>

        <div className="mt-4 flex flex-col space-y-4">
          <div className="flex w-full items-center justify-center self-end md:w-3/5">
            {products.map((product) => (
              <div
                key={product.id}
                className={`planBox ${
                  selectedPlan?.id === product.id
                    ? "opacity-100"
                    : "opacity-60"
                }`}
                onClick={() => setSelectedPlan(product)}
              >
                {product.name}
              </div>
            ))}
          </div>
          <Table products={products} selectedPlan={selectedPlan} />
          <button
            disabled={!selectedPlan || isBillingLoading}
            className={`mx-auto w-11/12 rounded bg-[#DF9DC0] py-4 text-xl shadow hover:bg-[#e096be] md:w-[420px] ${
              isBillingLoading && "opacity-60"
            }`}
            onClick={subscribeToPlan}
          >
            {isBillingLoading ? (
              <Loader color="white" size="h-5 w-5" />
            ) : (
              "Assinar"
            )}
          </button>
        </div>
      </main>
    </div>
  );
}

export default Plans;
