import React from "react";

interface Episodio {
  id: string;
  nome: string;
  subtitulo: string;
  video: string;
  pdf?: string | null;
}

interface EpisodiosProps {
  tituloSerie: string;
  episodios: Episodio[];
}

const Episodios: React.FC<EpisodiosProps> = ({ tituloSerie, episodios }) => {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">{tituloSerie}</h1>
      
      <div className="space-y-6">
        {episodios.map((ep, index) => (
          <div key={ep.id} className="p-4 border rounded-lg shadow-md bg-white">
            <h2 className="text-xl font-semibold mb-2">
              {index + 1}. {ep.nome}
            </h2>
            <p className="text-gray-700">{ep.subtitulo}</p>
            
            <div className="mt-4 flex items-center gap-4">
              <a 
                href={ep.video} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assistir
              </a>
              
              {ep.pdf && (
                <a 
                  href={ep.pdf} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Baixar PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Episodio;
