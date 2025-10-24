export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">Deployment Test</h1>
        <p className="text-center text-gray-600 mb-6">
          If you can see this page, the deployment is working correctly.
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <strong>Success!</strong> Next.js is serving pages correctly.
        </div>
        <a 
          href="/" 
          className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition"
        >
          Go to Home Page
        </a>
      </div>
    </div>
  );
}