import React from 'react';
import { WarningCircle, ArrowsClockwise, House } from '@phosphor-icons/react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Arckiv Unhandled Runtime Exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white border border-gray-200 p-8 rounded-3xl shadow-xl space-y-5">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <WarningCircle size={36} weight="duotone" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Arckiv is having trouble connecting</h2>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Something went wrong rendering this view. Your documents, uploads, and data remain completely secure.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
              >
                <ArrowsClockwise size={16} weight="bold" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard'; }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
              >
                <House size={16} weight="bold" />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
