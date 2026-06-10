import { currentScreen } from '@/lib/window';
import { Deck } from '@/windows/Deck';
import { Morning } from '@/windows/Morning';
import { Capture } from '@/windows/Capture';
import { Settings } from '@/windows/Settings';
import { Widget } from '@/windows/Widget';

export function App() {
  const screen = currentScreen();
  switch (screen) {
    case 'morning':
      return <Morning />;
    case 'capture':
      return <Capture />;
    case 'settings':
      return <Settings />;
    case 'widget':
      return <Widget />;
    default:
      return <Deck />;
  }
}
