import LegalPage from './LegalPage';

const sections = [
  ['Acceptance of Terms', 'By accessing and using Cloud Fashion, you agree to be bound by these Terms & Conditions and all applicable laws and regulations.'],
  ['Orders & Pricing', 'All prices are listed in INR and inclusive of applicable taxes. We reserve the right to modify prices and refuse or cancel any order at our discretion.'],
  ['Shipping & Delivery', 'Orders are processed within 1-2 business days. Delivery timelines are estimates and may vary. Free shipping applies to orders over ₹1999.'],
  ['Returns & Refunds', 'Items may be returned within 7 days of delivery in original condition with tags intact. Refunds are processed to the original payment method within 5-7 business days.'],
  ['Intellectual Property', 'All content on this site — including images, text, and branding — is the property of Cloud Fashion and may not be reproduced without permission.'],
];

export default function Terms() {
  return <LegalPage eyebrow="Legal" title="Terms & Conditions" sections={sections} />;
}
