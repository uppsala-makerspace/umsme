import { reactRoute } from '../../react/reactRoute';
import { CertificateListPage } from '/imports/ui/certificates/CertificateListPage';
import { CertificateEditPage } from '/imports/ui/certificates/CertificateEditPage';

reactRoute('/certificates', 'certificates', CertificateListPage);
reactRoute('/certificates/add', 'addcertificate', CertificateEditPage);
reactRoute('/certificate/:_id', 'certificateview', CertificateEditPage);
