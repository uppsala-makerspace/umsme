import Login from './Login';

export default {
  title: 'UMSAPP/Login',
  component: Login,
  parameters: {},
  tags: ['autodocs']
};

const method = () => {};

export const LoginPage = {
  args: {
    google: {method},
    facebook: {method}
  }
};
export const WrongPassword = {
  args: {
    google: {method},
    facebook: {method},
    errorKey: "loginWrongCredentials",
  }
};
