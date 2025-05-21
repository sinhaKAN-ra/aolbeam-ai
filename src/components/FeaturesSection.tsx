import { CheckCircle, Clock, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
    title: "Instant Feedback",
    description: "Get immediate evaluation and detailed explanations for every answer you submit."
  },
  {
    icon: <Clock className="h-8 w-8 text-primary" />,
    title: "Personalized Learning",
    description: "Practice problems adapt to your skill level and learning pace for optimal progress."
  },
  {
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
    title: "Track Your Progress",
    description: "Monitor your improvement over time with detailed performance analytics."
  }
];

export function FeaturesSection() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">How It Works</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Our platform makes learning efficient, effective, and engaging.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 pt-12 md:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center space-y-2 rounded-lg border p-6 text-center">
              <div className="rounded-full bg-primary/10 p-3">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
