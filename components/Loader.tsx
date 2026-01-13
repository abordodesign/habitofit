interface LoaderProps {
    color: string;
    size?: string;
  }
  
  const Loader: React.FC<LoaderProps> = ({ color, size = "h-3 w-3" }) => {
    return (
      <div className={`flex justify-center items-center`}>
        <div className={`animate-spin ${size} border-t-2 border-${color} rounded-full`}></div>
      </div>
    );
  };
  
  export default Loader;