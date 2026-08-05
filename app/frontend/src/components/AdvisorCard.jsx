import React from 'react';
import { Phone, Mail, Globe, MapPin, Building2, UserCheck } from 'lucide-react';

export default function AdvisorCard() {
  return (
    <div className="mt-3 mb-2 bg-white border border-[#0F52BA]/20 rounded-xl overflow-hidden shadow-sm w-full block">
      <div className="bg-[#0F52BA]/5 px-4 py-3 border-b border-[#0F52BA]/10 flex items-center gap-3">
        <div className="bg-[#0F52BA] p-2 rounded-lg text-white">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-display font-bold text-[#0F52BA] text-sm leading-tight">Ghanchi Investments</h4>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
            <UserCheck className="w-3 h-3" />
            Chandrakant B. Ghanchi (16+ Yrs)
          </p>
        </div>
      </div>
      
      <div className="p-3 space-y-1 bg-white">
        <a href="tel:+919820926446" className="flex items-start gap-3 text-sm hover:bg-muted/50 p-2 rounded-lg transition-colors group cursor-pointer decoration-transparent">
          <Phone className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-[#0F52BA]" />
          <div>
            <span className="block font-semibold text-foreground group-hover:text-[#0F52BA]">+91 9820926446</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Click to call</span>
          </div>
        </a>

        <a href="mailto:chandrakantlic@gmail.com" className="flex items-start gap-3 text-sm hover:bg-muted/50 p-2 rounded-lg transition-colors group cursor-pointer decoration-transparent">
          <Mail className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-[#0F52BA]" />
          <div>
            <span className="block font-semibold text-foreground group-hover:text-[#0F52BA]">chandrakantlic@gmail.com</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Click to email</span>
          </div>
        </a>

        <a href="https://www.ghanchiinvest.com" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm hover:bg-muted/50 p-2 rounded-lg transition-colors group cursor-pointer decoration-transparent">
          <Globe className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-[#0F52BA]" />
          <div>
            <span className="block font-semibold text-foreground group-hover:text-[#0F52BA]">www.ghanchiinvest.com</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Visit website</span>
          </div>
        </a>

        <a href="https://maps.google.com/?q=Ghanchi+Investments+CBD+Belapur" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm hover:bg-muted/50 p-2 rounded-lg transition-colors group cursor-pointer decoration-transparent">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 group-hover:text-[#0F52BA] shrink-0" />
          <div>
            <span className="block font-semibold text-foreground group-hover:text-[#0F52BA] leading-snug">Shop No. 27, Sector 11, CBD Belapur, Navi Mumbai</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Get directions</span>
          </div>
        </a>
      </div>
    </div>
  );
}
