import { Award, Flame, Heart, Leaf } from 'lucide-react';

const features = [
  {
    icon: Flame,
    title: 'Wood-Fired Oven',
    description: 'Traditional Neapolitan technique at 900°F for the perfect char',
  },
  {
    icon: Leaf,
    title: 'Fresh Ingredients',
    description: 'Locally sourced vegetables and imported Italian cheeses',
  },
  {
    icon: Heart,
    title: 'Made with Love',
    description: 'Family recipes passed down through three generations',
  },
  {
    icon: Award,
    title: 'Award Winning',
    description: 'Voted Best Pizza in the City for 5 consecutive years',
  },
];

const AboutSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Our Story
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6">
              A Tradition of Excellence
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Since 1985, Bella Pizza has been serving authentic Italian pizza to our community. 
              What started as a small family kitchen has grown into a beloved local institution, 
              but our commitment to quality has never wavered.
            </p>
            <p className="text-muted-foreground">
              Every pizza is made from scratch using our grandmother's secret recipe, 
              hand-tossed dough that's proofed for 72 hours, and sauce made from 
              San Marzano tomatoes imported directly from Italy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-card rounded-xl border border-border shadow-card hover:shadow-warm transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-serif font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
