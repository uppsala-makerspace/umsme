// Swish HTTP endpoint tests
import './swish/validation.test.js';
import './swish/no-initiated-payment.test.js';
import './swish/initiated-payment.test.js';
import './swish/idempotency.test.js';

// Business logic tests - membership rules from payments.js
import './business-logic/membership-types.test.js';
import './business-logic/renewal-timing.test.js';
import './business-logic/quarterly-lab.test.js';
import './business-logic/switching.test.js';
import './business-logic/family-switching.test.js';
import './business-logic/error-cases.test.js';
import './business-logic/member-denormalized.test.js';
