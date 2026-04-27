import React, {createContext, useContext, useState, useCallback} from 'react';

export type SignupStep = 1 | 2 | 3 | 4 | 5;

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface SignupContextValue {
  step: SignupStep;
  data: SignupData;
  setStep: (step: SignupStep) => void;
  updateData: (partial: Partial<SignupData>) => void;
  reset: () => void;
}

const initialData: SignupData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
};

const SignupContext = createContext<SignupContextValue | null>(null);

export const SignupProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [step, setStep] = useState<SignupStep>(1);
  const [data, setData] = useState<SignupData>(initialData);

  const updateData = useCallback((partial: Partial<SignupData>) => {
    setData(prev => ({...prev, ...partial}));
  }, []);

  const reset = useCallback(() => {
    setStep(1);
    setData(initialData);
  }, []);

  return (
    <SignupContext.Provider value={{step, data, setStep, updateData, reset}}>
      {children}
    </SignupContext.Provider>
  );
};

export const useSignup = (): SignupContextValue => {
  const ctx = useContext(SignupContext);
  if (!ctx) {
    throw new Error('useSignup must be used within a SignupProvider');
  }
  return ctx;
};
