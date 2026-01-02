import { useEffect } from 'react';
import '../client/main.css';
import i18n from '../imports/i18n';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';

/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  initialGlobals: {
    locale: 'sv',
  },
  globalTypes: {
    locale: {
      name: 'Locale',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'sv', title: 'Svenska' },
          { value: 'en', title: 'English' },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const { locale } = context.globals;

      useEffect(() => {
        i18n.changeLanguage(locale);
      }, [locale]);

      return (
        <Router>
          <Routes>
            <Route path="/*" element={(
              <div className="umsapp"><div className="login-form">
              <Story></Story>
            </div></div>)}>
            </Route>
          </Routes>
        </Router>
      );
    }
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;