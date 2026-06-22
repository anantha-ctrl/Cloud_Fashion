import LegalPage from './LegalPage';

const sections = [
  ['Information We Collect', 'We collect information you provide directly — name, email, shipping address, and payment details — as well as data about how you interact with our store to improve your experience.'],
  ['How We Use Your Data', 'Your information is used to process orders, personalise recommendations, send order updates, and (with your consent) marketing communications. We never sell your personal data.'],
  ['Payment Security', 'All payments are processed securely through Razorpay. We do not store your card details on our servers.'],
  ['Cookies', 'We use cookies to keep you signed in, remember your cart, and analyse site traffic. You can disable cookies in your browser settings.'],
  ['Your Rights', 'You may request access to, correction of, or deletion of your personal data at any time by contacting support@cloudfashion.com.'],
];

export default function Privacy() {
  return <LegalPage eyebrow="Legal" title="Privacy Policy" sections={sections} />;
}
