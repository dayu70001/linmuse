import {
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Shirt,
  Sparkles,
  Truck,
  Watch,
} from "lucide-react";

const whatsappNumber = "8613800000000";
const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  "Hello Lin Muse, I would like to learn more about wholesale cooperation."
)}`;

const categories = [
  {
    title: "Apparel",
    text: "Seasonal ready-to-wear, essential basics, and curated fashion lines for retail shelves and wholesale programs.",
    image:
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80",
    icon: Shirt,
  },
  {
    title: "Shoes",
    text: "Commercial footwear selections across casual, lifestyle, and fashion-forward categories.",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    icon: PackageCheck,
  },
  {
    title: "Watches",
    text: "Elegant everyday watches and giftable collections designed for distributors and retailers.",
    image:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80",
    icon: Watch,
  },
];

const strengths = [
  "Retail and wholesale supply",
  "Flexible order planning",
  "International business communication",
  "Category sourcing support",
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Lin Muse home">
          <span>Lin Muse</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#categories">Categories</a>
          <a href="#wholesale">Wholesale</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="header-action" href={whatsappLink} target="_blank" rel="noreferrer">
          <MessageCircle size={18} />
          WhatsApp
        </a>
      </header>

      <section className="hero" id="home">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-content">
          <p className="eyebrow">International retail and wholesale partner</p>
          <h1>Lin Muse</h1>
          <p className="hero-copy">
            Curated apparel, shoes, and watches for modern retail businesses,
            distributors, and cross-border wholesale buyers.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href={whatsappLink} target="_blank" rel="noreferrer">
              <MessageCircle size={19} />
              Contact on WhatsApp
            </a>
            <a className="secondary-button" href="#categories">
              View categories
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="intro-band" aria-label="Business highlights">
        <div>
          <Sparkles size={22} />
          <span>Premium positioning</span>
        </div>
        <div>
          <Globe2 size={22} />
          <span>International buyers</span>
        </div>
        <div>
          <Truck size={22} />
          <span>Wholesale-ready support</span>
        </div>
      </section>

      <section className="section" id="categories">
        <div className="section-heading">
          <p className="eyebrow">Product categories</p>
          <h2>Commercial selections for fashion retailers</h2>
        </div>
        <div className="category-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <article className="category-card" key={category.title}>
                <img src={category.image} alt={`${category.title} selection`} />
                <div className="category-body">
                  <Icon size={23} />
                  <h3>{category.title}</h3>
                  <p>{category.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="wholesale-section" id="wholesale">
        <div className="wholesale-copy">
          <p className="eyebrow">Wholesale cooperation</p>
          <h2>Built for buyers who need reliable category supply</h2>
          <p>
            Lin Muse supports retail stores, boutique buyers, online sellers,
            and distributors with product selection, order planning, and
            long-term wholesale cooperation.
          </p>
        </div>
        <div className="wholesale-panel">
          {strengths.map((item) => (
            <div className="check-row" key={item}>
              <Check size={18} />
              <span>{item}</span>
            </div>
          ))}
          <a className="primary-button full" href={whatsappLink} target="_blank" rel="noreferrer">
            <MessageCircle size={19} />
            Start wholesale inquiry
          </a>
        </div>
      </section>

      <section className="section about-layout" id="about">
        <div className="about-image" aria-label="Fashion showroom with curated retail products" />
        <div>
          <p className="eyebrow">About us</p>
          <h2>A focused brand for retail and wholesale fashion trade</h2>
          <p>
            Lin Muse connects product taste with commercial practicality. We
            focus on apparel, shoes, and watches that can serve both individual
            retail customers and larger wholesale partners.
          </p>
          <div className="stat-grid">
            <div>
              <strong>3</strong>
              <span>Core categories</span>
            </div>
            <div>
              <strong>B2B</strong>
              <span>Wholesale focus</span>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-section" id="contact">
        <div>
          <p className="eyebrow">Contact</p>
          <h2>Let us know what you want to source</h2>
          <p>
            Share your target category, market, quantity range, and preferred
            style direction. Lin Muse will reply with the next cooperation step.
          </p>
        </div>
        <div className="contact-card">
          <a href={whatsappLink} target="_blank" rel="noreferrer">
            <MessageCircle size={20} />
            WhatsApp inquiry
          </a>
          <a href="mailto:hello@linmuse.com">
            <Mail size={20} />
            hello@linmuse.com
          </a>
          <a href="tel:+8613800000000">
            <Phone size={20} />
            +86 138 0000 0000
          </a>
          <span>
            <MapPin size={20} />
            International wholesale service
          </span>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <Building2 size={20} />
          <span>Lin Muse</span>
        </div>
        <p>Apparel, shoes, and watches for retail and wholesale business.</p>
      </footer>
    </main>
  );
}
