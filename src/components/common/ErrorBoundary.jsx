import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unknown rendering error",
    };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Application crashed", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-bold">Application Error</h1>
          <p className="mt-2 text-sm">
            A runtime error occurred. Open browser DevTools Console for stack trace.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-xs text-red-700">
            {this.state.errorMessage}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            className="mt-4 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
