import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const certificateListPage = () => import('/imports/ui/certificates/CertificateListPage');
const certificateEditPage = () => import('/imports/ui/certificates/CertificateEditPage');

reactRoute('/certificates', 'certificates', lazyPage(certificateListPage, 'CertificateListPage'));
reactRoute('/certificates/add', 'addcertificate', lazyPage(certificateEditPage, 'CertificateEditPage'));
reactRoute('/certificate/:_id', 'certificateview', lazyPage(certificateEditPage, 'CertificateEditPage'));
