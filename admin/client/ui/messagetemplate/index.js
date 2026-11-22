import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const messageTemplateListPage = () => import('/imports/ui/messageTemplates/MessageTemplateListPage');
const messageTemplateEditPage = () => import('/imports/ui/messageTemplates/MessageTemplateEditPage');

reactRoute('/templates', 'templates', lazyPage(messageTemplateListPage, 'MessageTemplateListPage'));
reactRoute('/templates/add', 'addtemplate', lazyPage(messageTemplateEditPage, 'MessageTemplateEditPage'));
reactRoute('/template/:_id', 'templateview', lazyPage(messageTemplateEditPage, 'MessageTemplateEditPage'));
