/**
 * Loading Spinner Component
 * 
 * Reusable full-screen or inline loading indicator
 */
const LoadingSpinner = ({ fullScreen = true, message = "Loading..." }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${
        fullScreen ? "fixed inset-0 bg-white z-50" : "py-16"
      }`}
    >
      <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
