import { Calculator } from './components/Calculator/Calculator';
import { CalculatorProvider } from './components/CalculatorProvider/CalculatorProvider';
import { HistoryProvider } from './components/HistoryProvider/HistoryProvider';
import { ThemeProvider } from './components/ThemeProvider/ThemeProvider';

export function App() {
  return (
    <ThemeProvider>
      <CalculatorProvider>
        <HistoryProvider>
          <Calculator />
        </HistoryProvider>
      </CalculatorProvider>
    </ThemeProvider>
  );
}
