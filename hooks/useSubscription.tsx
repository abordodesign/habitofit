import React, { useState, useEffect } from 'react';
import { checkSubscriptionStatus } from '@/firebase';
// Substitua pelo caminho correto para o arquivo de sua função de consulta

function useSubscription() {
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const subscriptionData = await checkSubscriptionStatus();
        const hasActiveSubscription: boolean = !!subscriptionData; // Verifica se a assinatura foi encontrada
        setHasSubscription(hasActiveSubscription);
      } catch (error) {
        console.error('Erro ao verificar status da assinatura:', error);
        setHasSubscription(false);
      }
    };

    fetchSubscriptionStatus(); // Chama a função de consulta quando o componente é montado

    // Se você precisar limpar recursos quando o componente é desmontado, você pode fazer isso aqui
    // return () => {
    //   // Limpar recursos, se necessário
    // };
  }, []); // O segundo argumento vazio [] faz com que o efeito seja executado apenas uma vez, após a montagem do componente

  return hasSubscription;
}

export default useSubscription;
