import { Link } from "wouter";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div data-testid="footer-brand">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 gradient-tropical rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">C</span>
              </div>
              <span className="text-xl font-bold text-white">Cool'Slush</span>
            </div>
            <p className="text-sm text-slate-400">
              Location de machines à granité professionnelles en Guadeloupe. Service tout inclus avec livraison.
            </p>
          </div>

          <div data-testid="footer-navigation">
            <h3 className="text-white font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li><a href="/#services" className="hover:text-primary transition-colors">Services</a></li>
              <li><a href="/#tarifs" className="hover:text-primary transition-colors">Tarifs</a></li>
              <li><Link href="/booking" className="hover:text-primary transition-colors">Réserver</Link></li>
            </ul>
          </div>

          <div data-testid="footer-legal">
            <h3 className="text-white font-semibold mb-4">Légal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/terms" className="hover:text-primary transition-colors">Conditions générales</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-primary transition-colors">Politique de confidentialité</Link></li>
              <li><Link href="/legal/mentions" className="hover:text-primary transition-colors">Mentions légales</Link></li>
              <li><Link href="/legal/terms" className="hover:text-primary transition-colors">CGV</Link></li>
            </ul>
          </div>

          <div data-testid="footer-contact">
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <Phone className="text-primary mr-3 mt-1 w-4 h-4" />
                <a href="tel:+590690123456" className="hover:text-primary transition-colors">0690 12 34 56</a>
              </li>
              <li className="flex items-start">
                <Mail className="text-primary mr-3 mt-1 w-4 h-4" />
                <a href="mailto:contact@coolslush.gp" className="hover:text-primary transition-colors">contact@coolslush.gp</a>
              </li>
              <li className="flex items-start">
                <MapPin className="text-primary mr-3 mt-1 w-4 h-4" />
                <span>Guadeloupe, Antilles Françaises</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-500 mb-4 md:mb-0" data-testid="text-copyright">
            © 2024 Cool'Slush Guadeloupe. Tous droits réservés.
          </p>
          <div className="flex space-x-4" data-testid="social-links">
            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
              <span className="sr-only">Facebook</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary transition-colors">
              <span className="sr-only">Instagram</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.017 0H7.983C3.585 0 0 3.585 0 7.983v4.034C0 16.415 3.585 20 7.983 20h4.034C16.415 20 20 16.415 20 12.017V7.983C20 3.585 16.415 0 12.017 0zM18.013 12.017c0 3.3-2.696 5.996-5.996 5.996H7.983c-3.3 0-5.996-2.696-5.996-5.996V7.983c0-3.3 2.696-5.996 5.996-5.996h4.034c3.3 0 5.996 2.696 5.996 5.996v4.034z" clipRule="evenodd" />
                <path d="M10 5.435c-2.513 0-4.565 2.052-4.565 4.565S7.487 14.565 10 14.565s4.565-2.052 4.565-4.565S12.513 5.435 10 5.435zm0 7.528c-1.636 0-2.963-1.327-2.963-2.963S8.364 7.037 10 7.037s2.963 1.327 2.963 2.963S11.636 12.963 10 12.963z" />
                <circle cx="14.678" cy="5.322" r="1.092" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
