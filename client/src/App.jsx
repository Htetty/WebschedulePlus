import "./App.css";
import Mapbox from "./components/mapbox";
import Header from "./components/header";

function App() {
  return (
    <div className="relative w-full h-screen">
      <div className="absolute inset-0 bg-white p-2">
        <div className="grid grid-rows-[1fr_3fr] gap-4 h-full">
          <div className="relative rounded-lg overflow-hidden">
            <Header />
          </div>
          <div className="relative rounded-lg overflow-hidden">
            <Mapbox />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
