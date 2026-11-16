// Continente (ou "Brasil") de um destino, pelo codigo IATA ou, se faltar, pelo nome.
const BR = new Set('GRU CGH VCP SAO GIG SDU BSB CNF PLU SSA REC FOR NAT MCZ AJU JPA SLZ BEL MAO CWB POA FLN NVT JOI IGU UDI GYN CGB CGR VIX BPS IOS THE PMW SJP LDB MGF PFB BYO CAC AAX RAO LEC FEN STM PVH RBR MCP BVB MII MOC IMP CFB PHB IZA GVR VDC CXJ CPV JDF XAP PNZ BAU OPS CKS ATM MVF'.split(' '));
const IATA = {
  'América do Sul': 'EZE AEP MDZ COR USH BRC IGR SCL LIM CUZ BOG MDE CTG CLO UIO GYE MVD PDP ASU LPB VVI SRZ CCS GEO PBM AUA CUR'.split(' '),
  'América do Norte e Central': 'JFK EWR LGA IAD DCA IAH MIA FLL MCO LAX SFO LAS ORD ATL BOS SEA DFW YYZ YUL YVR MEX CUN GDL SJO PTY SJU PUJ SDQ HAV NAS MBJ SAL GUA SJD'.split(' '),
  'Europa': 'LIS OPO MAD BCN CDG ORY FCO MXP VCE LHR LGW AMS FRA MUC ZRH GVA BRU VIE IST ATH DUB CPH ARN OSL HEL PRG BUD WAW MAN EDI'.split(' '),
  'África': 'JNB CPT ADD CAI CMN LOS ACC NBO MPM LAD MRU RAK TUN ALG DKR'.split(' '),
  'Ásia e Oriente Médio': 'DOH DXB AUH TLV AMM BKK SIN HKG NRT HND ICN PEK PVG DEL BOM KUL MNL CGK SGN KTM CMB MLE'.split(' '),
  'Oceania': 'SYD MEL AKL BNE PER'.split(' '),
};
const NOME = [
  ['América do Sul', /buenos aires|mendoza|bariloche|ushuaia|santiago|lima|cusco|bogot|medell|cartagena|quito|guayaquil|montevi|punta del este|assun|la paz|santa cruz|bol[ií]via|uruguai|argentina|chile|peru|col[oô]mbia|paraguai|equador|san andr/i],
  ['América do Norte e Central', /nova york|new york|washington|houston|miami|fort lauderdale|orlando|los angeles|san francisco|las vegas|chicago|atlanta|boston|seattle|dallas|toronto|montreal|vancouver|m[eé]xico|canc[uú]n|san jos|costa rica|panam|caribe|punta cana|havana|jamaica|aruba|cura[cç]ao|estados unidos|canad[aá]/i],
  ['Europa', /lisboa|porto(?! alegre| seguro| velho)|madri|madrid|barcelona|paris|roma|rome|mil[aã]o|veneza|londres|amsterd|frankfurt|munique|zurique|genebra|bruxelas|viena|istambul|atenas|dublin|copenhag|estocolmo|oslo|helsin|praga|budapeste|var[sç]via|manchester|edimburgo|portugal|espanha|fran[cç]a|it[aá]lia|alemanha|inglaterra|europa/i],
  ['África', /joanesburgo|cidade do cabo|adis abeba|cairo|marrocos|casablanca|lagos|acra|nair[oó]bi|luanda|maur[ií]cio|marrakech|t[uú]nis|africa|áfrica/i],
  ['Ásia e Oriente Médio', /doha|dubai|abu dhabi|tel aviv|t[oó]quio|tokyo|seul|pequim|xangai|bangkok|singapura|hong kong|nova del|mumbai|bali|jacarta|catar|jap[aã]o|china|t[aá]ilândia|[ií]ndia/i],
  ['Oceania', /sydney|melbourne|auckland|brisbane|perth|austr[aá]lia|nova zel/i],
];
function continente(dc, dn) {
  if (dc) {
    if (BR.has(dc)) return 'Brasil';
    for (const k of Object.keys(IATA)) if (IATA[k].includes(dc)) return k;
  }
  const n = dn || '';
  if (/florian|salvador|recife|fortaleza|natal|macei|aracaju|jo[aã]o pessoa|s[aã]o lu[ií]s|bel[eé]m|manaus|curitiba|porto alegre|navegantes|joinville|foz|uberl|goi[aâ]nia|cuiab|campo grande|vit[oó]ria|porto seguro|ilh[eé]us|teresina|londrina|maring|bras[ií]lia|belo horizonte|rio de janeiro|bonito|noronha|jericoacoara|petrolina|ribeir|chapec|caldas|maca[pé]|boa vista|santar|palmas|imperatriz|montes claros|juiz de fora|caxias|campina grande|parna[ií]ba|passo fundo/i.test(n)) return 'Brasil';
  for (const [k, re] of NOME) if (re.test(n)) return k;
  return 'Outros';
}
const LISTA = ['Brasil', 'América do Sul', 'América do Norte e Central', 'Europa', 'África', 'Ásia e Oriente Médio', 'Oceania', 'Outros'];
module.exports = { continente, LISTA };
