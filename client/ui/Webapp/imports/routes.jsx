import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/register', {
    action() {
      console.log("Hemsida") // Om du vill omdirigera till en specifik sida
    }
  });

  FlowRouter.route('/login', {
    action() {
      console.log("Navigerar till register")// Om du vill omdirigera till en specifik sida
    }

  });

  FlowRouter.route('/loggedIn',{
    action(){
        console.log("Inloggad")
    }
  });