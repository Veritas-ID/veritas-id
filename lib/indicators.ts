export const INDICATORS: Record<string, { code: string; label: string; short: string }> = {
  "youth unemployment":         { code: "SL.UEM.1524.ZS",    label: "Youth Unemployment",               short: "UNEM" },
  "gdp growth":                 { code: "NY.GDP.MKTP.KD.ZG", label: "GDP Growth",                       short: "GDP"  },
  "literacy rate":              { code: "SE.ADT.LITR.ZS",    label: "Adult Literacy Rate",              short: "LITR" },
  "inflation":                  { code: "FP.CPI.TOTL.ZG",    label: "Inflation Rate",                   short: "INFL" },
  "female labor participation": { code: "SL.TLF.ACTI.FE.ZS", label: "Female Labor Force Participation", short: "FLAB" },
  "co2 emissions":              { code: "EN.ATM.CO2E.PC",    label: "CO2 Emissions per Capita",         short: "CO2"  },
  "population growth":          { code: "SP.POP.GROW",       label: "Population Growth",                short: "POPG" },
};
