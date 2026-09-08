import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-inner">
        <FileQuestion className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">Page Not Found</h1>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        The destination you are trying to access does not exist or has been relocated.
      </p>
      <Button
        variant="primary"
        size="sm"
        icon={<ArrowLeft className="w-3.5 h-3.5" />}
        onClick={() => navigate('/inspector/dashboard')}
      >
        Return to Dashboard
      </Button>
    </div>
  );
};

