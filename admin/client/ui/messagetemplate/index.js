import { reactRoute } from '../../react/reactRoute';
import { MessageTemplateListPage } from '/imports/ui/messageTemplates/MessageTemplateListPage';
import { MessageTemplateEditPage } from '/imports/ui/messageTemplates/MessageTemplateEditPage';

reactRoute('/templates', 'templates', MessageTemplateListPage);
reactRoute('/templates/add', 'addtemplate', MessageTemplateEditPage);
reactRoute('/template/:_id', 'templateview', MessageTemplateEditPage);
