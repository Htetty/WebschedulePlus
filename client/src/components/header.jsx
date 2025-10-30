import logo from "../../shared/logo.png";

function Header() {
  return (
    <div className="w-full bg-[#1E1E2E] px-4 py-4 relative">
      <div className="flex items-center gap-3">
        <img
          src={logo}
          alt="Calendar Icon"
          className="w-[50px] h-[50px] -mt-1"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-white text-[22px] leading-tight font-semibold">
            WebSchedule+
          </h1>
          <p className="text-sm text-gray-300">
            Enhance Your WebSchedule Experience
          </p>
        </div>
      </div>

      <div className="mt-3">
        <a
          href="https://webschedule.smccd.edu/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="bg-[#FFD700] text-[#002F65] font-semibold py-2 px-3 rounded-lg hover:bg-[#FFC300]">
            Go to WebSchedule
          </button>
        </a>
      </div>
    </div>
  );
}

export default Header;
