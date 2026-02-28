import { motion } from "framer-motion";
import { Clock, Users } from "lucide-react";
import { useState, useMemo } from "react";

// Seeded random for consistent "taken" seats across users
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

// State data with seat limits
const stateData: { id: string; seats: number; name: string }[] = [
  { id: "AL", seats: 9, name: "Alabama" },
  { id: "AK", seats: 3, name: "Alaska" },
  { id: "AZ", seats: 11, name: "Arizona" },
  { id: "AR", seats: 6, name: "Arkansas" },
  { id: "CA", seats: 54, name: "California" },
  { id: "CO", seats: 10, name: "Colorado" },
  { id: "CT", seats: 7, name: "Connecticut" },
  { id: "DE", seats: 3, name: "Delaware" },
  { id: "FL", seats: 30, name: "Florida" },
  { id: "GA", seats: 16, name: "Georgia" },
  { id: "HI", seats: 4, name: "Hawaii" },
  { id: "ID", seats: 4, name: "Idaho" },
  { id: "IL", seats: 19, name: "Illinois" },
  { id: "IN", seats: 11, name: "Indiana" },
  { id: "IA", seats: 6, name: "Iowa" },
  { id: "KS", seats: 6, name: "Kansas" },
  { id: "KY", seats: 8, name: "Kentucky" },
  { id: "LA", seats: 8, name: "Louisiana" },
  { id: "ME", seats: 4, name: "Maine" },
  { id: "MD", seats: 10, name: "Maryland" },
  { id: "MA", seats: 11, name: "Massachusetts" },
  { id: "MI", seats: 15, name: "Michigan" },
  { id: "MN", seats: 10, name: "Minnesota" },
  { id: "MS", seats: 6, name: "Mississippi" },
  { id: "MO", seats: 10, name: "Missouri" },
  { id: "MT", seats: 4, name: "Montana" },
  { id: "NE", seats: 5, name: "Nebraska" },
  { id: "NV", seats: 6, name: "Nevada" },
  { id: "NH", seats: 4, name: "New Hampshire" },
  { id: "NJ", seats: 14, name: "New Jersey" },
  { id: "NM", seats: 5, name: "New Mexico" },
  { id: "NY", seats: 28, name: "New York" },
  { id: "NC", seats: 16, name: "North Carolina" },
  { id: "ND", seats: 3, name: "North Dakota" },
  { id: "OH", seats: 17, name: "Ohio" },
  { id: "OK", seats: 7, name: "Oklahoma" },
  { id: "OR", seats: 8, name: "Oregon" },
  { id: "PA", seats: 19, name: "Pennsylvania" },
  { id: "RI", seats: 4, name: "Rhode Island" },
  { id: "SC", seats: 9, name: "South Carolina" },
  { id: "SD", seats: 3, name: "South Dakota" },
  { id: "TN", seats: 11, name: "Tennessee" },
  { id: "TX", seats: 40, name: "Texas" },
  { id: "UT", seats: 6, name: "Utah" },
  { id: "VT", seats: 3, name: "Vermont" },
  { id: "VA", seats: 13, name: "Virginia" },
  { id: "WA", seats: 12, name: "Washington" },
  { id: "WV", seats: 4, name: "West Virginia" },
  { id: "WI", seats: 10, name: "Wisconsin" },
  { id: "WY", seats: 3, name: "Wyoming" },
  { id: "DC", seats: 3, name: "Washington D.C." },
];

const TerritoryMap = () => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  
  // Calculate seats left (40-50% taken) with consistent seed
  const stateSeatsData = useMemo(() => {
    const seed = 12345; // Fixed seed for consistency
    const rng = new SeededRandom(seed);
    return stateData.map(state => {
      const takenPercent = 0.4 + (rng.next() * 0.1); // 40-50% taken
      const seatsLeft = Math.max(1, Math.floor(state.seats * (1 - takenPercent)));
      return { ...state, seatsLeft };
    });
  }, []);
  
  const totalSeats = stateData.reduce((sum, s) => sum + s.seats, 0);
  const totalSeatsLeft = stateSeatsData.reduce((sum, s) => sum + s.seatsLeft, 0);
  const hoveredData = stateSeatsData.find(s => s.id === hoveredState);
  
  // Get urgency level based on seats left percentage
  const getUrgencyLevel = (seatsLeft: number, total: number) => {
    const percent = seatsLeft / total;
    if (percent <= 0.3) return "critical"; // 30% or less left
    if (percent <= 0.5) return "low";
    return "available";
  };
  
  return (
    <section className="section-padding bg-gradient-dark relative overflow-hidden">
      {/* Section divider */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Background effects - reduced opacity */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,214,50,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,214,50,0.01)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/3 rounded-full blur-3xl opacity-60" />
      
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-alert/10 border border-alert/30 mb-6">
            <Clock className="w-4 h-4 text-alert" />
            <span className="text-sm font-black text-alert tracking-wider">SCARCITY NOTICE</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            <span className="glow-text">Limited Seats</span> Per State
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-lg leading-relaxed">
            To protect exclusivity and avoid agent saturation, we onboard only{" "}
            <span className="text-primary font-black">10 agents per week</span> nationwide.
          </p>
        </motion.div>

        {/* State Grid */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative max-w-5xl mx-auto mb-8"
        >
          <div className="glass-card p-6 md:p-10 relative overflow-hidden">
            {/* Hover info tooltip */}
            {hoveredData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-4 right-4 z-20 glass-card p-4 border-primary/40"
              >
                <p className="text-sm text-muted-foreground">State</p>
                <p className="text-xl font-black text-foreground">{hoveredData.name}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Seats</p>
                <p className="text-xl font-black text-foreground">{hoveredData.seats}</p>
                <p className="text-sm text-muted-foreground mt-2">Seats Left</p>
                <p className="text-3xl font-black text-red-500 animate-pulse">{hoveredData.seatsLeft}</p>
              </motion.div>
            )}
            
            {/* Grid of states */}
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-12 gap-2 md:gap-3">
              {stateSeatsData.map((state, index) => {
                const urgency = getUrgencyLevel(state.seatsLeft, state.seats);
                const isHovered = hoveredState === state.id;
                
                return (
                  <motion.div
                    key={state.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.02 }}
                    onMouseEnter={() => setHoveredState(state.id)}
                    onMouseLeave={() => setHoveredState(null)}
                    className={`
                      relative aspect-square rounded-lg cursor-pointer
                      flex flex-col items-center justify-center
                      transition-all duration-300 ease-out
                      border
                      ${isHovered 
                        ? "scale-110 z-10 border-red-500 bg-red-500/30 shadow-[0_0_25px_rgba(239,68,68,0.6)]" 
                        : urgency === "critical"
                          ? "border-red-500/60 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          : urgency === "low"
                            ? "border-orange-500/40 bg-orange-500/15 shadow-[0_0_10px_rgba(249,115,22,0.2)]"
                            : "border-primary/25 bg-primary/10"
                      }
                    `}
                  >
                    <span className={`
                      text-xs sm:text-sm font-black
                      ${isHovered ? "text-red-400" : "text-foreground"}
                    `}>
                      {state.id}
                    </span>
                    <span className={`
                      text-[10px] sm:text-xs font-bold
                      ${urgency === "critical" ? "text-red-400 animate-pulse" : urgency === "low" ? "text-orange-400" : "text-muted-foreground"}
                    `}>
                      {state.seatsLeft}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-500/20 border border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
                <span className="text-sm text-muted-foreground">Critical (&lt;30% left)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-orange-500/15 border border-orange-500/40" />
                <span className="text-sm text-muted-foreground">Low (30-50% left)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary/10 border border-primary/25" />
                <span className="text-sm text-muted-foreground">Available (50%+ left)</span>
              </div>
            </div>

            {/* Scarcity Warning */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8 pt-6 border-t border-border/30 text-center"
            >
              <p className="text-lg text-alert font-bold">
                Once your state hits capacity, you'll be waitlisted until a spot opens.
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 text-center"
          >
            <p className="text-3xl font-black glow-text">{totalSeats}</p>
            <p className="text-sm text-muted-foreground">Total Seats Nationwide</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
            className="glass-card p-6 text-center border-red-500/30"
          >
            <p className="text-3xl font-black text-red-500 animate-pulse">{totalSeatsLeft}</p>
            <p className="text-sm text-muted-foreground">Seats Left</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 text-center"
          >
            <Users className="w-8 h-8 text-alert mx-auto mb-3" />
            <p className="text-3xl font-black text-alert">10</p>
            <p className="text-sm text-muted-foreground">Agents Onboarded / Week</p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 text-center"
          >
            <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="text-3xl font-black text-foreground">5+ Years</p>
            <p className="text-sm text-muted-foreground">Clients Partnered With Us</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TerritoryMap;