import '../client/main.css';
import '../imports/i18n';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';

/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  decorators:
    [(Story) => {
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
    }],
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