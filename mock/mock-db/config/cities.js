const CITY_CSV = `Mumbai|Maharashtra|tier1|19.076|72.8777|38|7.2|west|1|heavy|0.1|0.7
Delhi|Delhi|tier1|28.6139|77.209|42|7|north|0|moderate|1|0.95
Bengaluru|Karnataka|tier1|12.9716|77.5946|36|6.5|south|0|moderate|0.1|0.5
Hyderabad|Telangana|tier1|17.385|78.4867|34|5.8|south|0|moderate|0.1|0.88
Chennai|Tamil Nadu|tier1|13.0827|80.2707|33|5.5|south|1|heavy|0.05|0.82
Kolkata|West Bengal|tier1|22.5726|88.3639|33|5.4|east|0|heavy|0.45|0.72
Pune|Maharashtra|tier1|18.5204|73.8567|28|4.6|west|0|moderate|0.05|0.66
Ahmedabad|Gujarat|tier1|23.0225|72.5714|30|4.4|west|0|light|0.2|0.92
Jaipur|Rajasthan|tier2|26.9124|75.7873|27|2.6|north|0|light|0.6|0.93
Surat|Gujarat|tier2|21.1702|72.8311|24|2.35|west|1|heavy|0.12|0.85
Lucknow|Uttar Pradesh|tier2|26.8467|80.9462|25|2.25|north|0|moderate|0.72|0.9
Kanpur|Uttar Pradesh|tier2|26.4499|80.3319|24|2.05|north|0|moderate|0.8|0.88
Nagpur|Maharashtra|tier2|21.1458|79.0882|24|2|central|0|moderate|0.2|0.96
Patna|Bihar|tier2|25.5941|85.1376|23|1.95|east|0|heavy|0.7|0.82
Indore|Madhya Pradesh|tier2|22.7196|75.8577|23|1.9|central|0|moderate|0.2|0.86
Bhopal|Madhya Pradesh|tier2|23.2599|77.4126|22|1.8|central|0|moderate|0.28|0.83
Visakhapatnam|Andhra Pradesh|tier2|17.6868|83.2185|22|1.75|east|1|heavy|0.05|0.72
Coimbatore|Tamil Nadu|tier2|11.0168|76.9558|22|1.7|south|0|moderate|0.02|0.7
Thane|Maharashtra|tier2|19.2183|72.9781|20|1.65|west|1|heavy|0.1|0.7
Vadodara|Gujarat|tier2|22.3072|73.1812|21|1.6|west|0|moderate|0.15|0.86
Ludhiana|Punjab|tier2|30.901|75.8573|21|1.55|north|0|light|0.82|0.78
Agra|Uttar Pradesh|tier2|27.1767|78.0081|20|1.48|north|0|moderate|0.74|0.87
Nashik|Maharashtra|tier2|19.9975|73.7898|20|1.42|west|0|moderate|0.08|0.78
Faridabad|Haryana|tier2|28.4089|77.3178|19|1.36|north|0|moderate|0.9|0.92
Meerut|Uttar Pradesh|tier2|28.9845|77.7064|19|1.32|north|0|moderate|0.86|0.88
Rajkot|Gujarat|tier2|22.3039|70.8022|19|1.28|west|0|light|0.1|0.91
Varanasi|Uttar Pradesh|tier2|25.3176|82.9739|19|1.24|north|0|moderate|0.7|0.83
Srinagar|Jammu and Kashmir|tier2|34.0837|74.7973|18|1.2|north|0|light|0.95|0.35
Aurangabad|Maharashtra|tier2|19.8762|75.3433|18|1.15|central|0|moderate|0.08|0.84
Dhanbad|Jharkhand|tier2|23.7957|86.4304|18|1.12|east|0|moderate|0.45|0.78
Amritsar|Punjab|tier2|31.634|74.8723|18|1.08|north|0|light|0.86|0.76
Allahabad|Uttar Pradesh|tier2|25.4358|81.8463|18|1.04|north|0|moderate|0.68|0.84
Ranchi|Jharkhand|tier2|23.3441|85.3096|18|1.01|east|0|heavy|0.35|0.74
Howrah|West Bengal|tier2|22.5958|88.2636|17|0.98|east|0|heavy|0.44|0.7
Jabalpur|Madhya Pradesh|tier2|23.1815|79.9864|17|0.95|central|0|moderate|0.25|0.83
Gwalior|Madhya Pradesh|tier2|26.2183|78.1828|17|0.92|north|0|light|0.55|0.87
Vijayawada|Andhra Pradesh|tier2|16.5062|80.648|17|0.89|south|0|heavy|0.05|0.78
Jodhpur|Rajasthan|tier2|26.2389|73.0243|17|0.86|north|0|light|0.48|0.95
Madurai|Tamil Nadu|tier2|9.9252|78.1198|17|0.83|south|0|moderate|0.02|0.79
Raipur|Chhattisgarh|tier2|21.2514|81.6296|17|0.8|central|0|moderate|0.18|0.9
Kota|Rajasthan|tier2|25.2138|75.8648|16|0.77|north|0|light|0.45|0.94
Guwahati|Assam|tier2|26.1445|91.7362|18|0.74|east|0|heavy|0.3|0.65
Chandigarh|Chandigarh|tier2|30.7333|76.7794|15|0.71|north|0|moderate|0.82|0.78
Solapur|Maharashtra|tier2|17.6599|75.9064|16|0.68|west|0|light|0.05|0.9
Hubli|Karnataka|tier2|15.3647|75.124|16|0.65|south|0|moderate|0.05|0.78
Bareilly|Uttar Pradesh|tier2|28.367|79.4304|16|0.62|north|0|moderate|0.8|0.86
Mysuru|Karnataka|tier2|12.2958|76.6394|15|0.59|south|0|moderate|0.03|0.65
Tiruchirappalli|Tamil Nadu|tier2|10.7905|78.7047|15|0.56|south|0|moderate|0.02|0.78
Salem|Tamil Nadu|tier2|11.6643|78.146|15|0.53|south|0|moderate|0.02|0.76
Aligarh|Uttar Pradesh|tier3|27.8974|78.088|15|0.5|north|0|moderate|0.72|0.85
Moradabad|Uttar Pradesh|tier3|28.8386|78.7733|15|0.48|north|0|moderate|0.82|0.84
Bhiwandi|Maharashtra|tier3|19.2813|73.0483|14|0.46|west|1|heavy|0.08|0.74
Saharanpur|Uttar Pradesh|tier3|29.968|77.5552|14|0.44|north|0|moderate|0.86|0.8
Gorakhpur|Uttar Pradesh|tier3|26.7606|83.3732|14|0.42|north|0|heavy|0.65|0.8
Bikaner|Rajasthan|tier3|28.0229|73.3119|14|0.4|north|0|light|0.5|0.96
Amravati|Maharashtra|tier3|20.9374|77.7796|14|0.39|central|0|moderate|0.12|0.9
Noida|Uttar Pradesh|tier3|28.5355|77.391|14|0.38|north|0|moderate|0.92|0.9
Jamshedpur|Jharkhand|tier3|22.8046|86.2029|14|0.37|east|0|heavy|0.35|0.76
Bhilai|Chhattisgarh|tier3|21.1938|81.3509|14|0.36|central|0|moderate|0.15|0.87
Cuttack|Odisha|tier3|20.4625|85.8828|14|0.35|east|0|heavy|0.15|0.79
Firozabad|Uttar Pradesh|tier3|27.1591|78.3957|13|0.34|north|0|moderate|0.72|0.86
Kochi|Kerala|tier3|9.9312|76.2673|13|0.33|south|1|heavy|0.01|0.56
Nellore|Andhra Pradesh|tier3|14.4426|79.9865|13|0.32|south|0|heavy|0.02|0.8
Bhavnagar|Gujarat|tier3|21.7645|72.1519|13|0.31|west|1|moderate|0.12|0.86
Dehradun|Uttarakhand|tier3|30.3165|78.0322|13|0.3|north|0|moderate|0.84|0.66
Durgapur|West Bengal|tier3|23.5204|87.3119|13|0.29|east|0|heavy|0.42|0.74
Asansol|West Bengal|tier3|23.6739|86.9524|13|0.28|east|0|heavy|0.42|0.75
Rourkela|Odisha|tier3|22.2604|84.8536|13|0.27|east|0|heavy|0.2|0.79
Nanded|Maharashtra|tier3|19.1383|77.321|13|0.26|central|0|moderate|0.08|0.87
Kolhapur|Maharashtra|tier3|16.705|74.2433|13|0.25|west|0|heavy|0.03|0.76
Ajmer|Rajasthan|tier3|26.4499|74.6399|13|0.24|north|0|light|0.5|0.9
Akola|Maharashtra|tier3|20.7096|77.0027|12|0.23|central|0|moderate|0.1|0.9
Gulbarga|Karnataka|tier3|17.3297|76.8343|12|0.22|south|0|light|0.04|0.88
Jamnagar|Gujarat|tier3|22.4707|70.0577|12|0.21|west|1|moderate|0.08|0.88
Ujjain|Madhya Pradesh|tier3|23.1765|75.7885|12|0.2|central|0|moderate|0.22|0.84
Loni|Uttar Pradesh|tier3|28.7333|77.2833|12|0.19|north|0|moderate|0.92|0.89
Siliguri|West Bengal|tier3|26.7271|88.3953|12|0.18|east|0|heavy|0.35|0.68
Jhansi|Uttar Pradesh|tier3|25.4484|78.5685|12|0.17|north|0|light|0.48|0.88
Ulhasnagar|Maharashtra|tier3|19.2215|73.1645|12|0.16|west|1|heavy|0.08|0.73
Jammu|Jammu and Kashmir|tier3|32.7266|74.857|12|0.15|north|0|light|0.9|0.62
Sangli|Maharashtra|tier3|16.8524|74.5815|12|0.14|west|0|moderate|0.03|0.78
Mangalore|Karnataka|tier3|12.9141|74.856|12|0.13|south|1|heavy|0.02|0.62
Erode|Tamil Nadu|tier3|11.341|77.7172|12|0.12|south|0|moderate|0.02|0.75
Belgaum|Karnataka|tier3|15.8497|74.4977|12|0.11|south|0|heavy|0.03|0.74
Ambattur|Tamil Nadu|tier3|13.1143|80.1548|11|0.1|south|1|heavy|0.02|0.8
Tirunelveli|Tamil Nadu|tier3|8.7139|77.7567|11|0.098|south|0|moderate|0.01|0.77
Malegaon|Maharashtra|tier3|20.5579|74.5089|11|0.096|west|0|moderate|0.08|0.81
Gaya|Bihar|tier3|24.7914|85.0002|11|0.094|east|0|moderate|0.58|0.8
Jalgaon|Maharashtra|tier3|21.0077|75.5626|11|0.092|central|0|moderate|0.1|0.88
Udaipur|Rajasthan|tier3|24.5854|73.7125|11|0.09|north|0|light|0.35|0.86
Maheshtala|West Bengal|tier3|22.5086|88.2532|11|0.088|east|0|heavy|0.4|0.7
Davanagere|Karnataka|tier3|14.4644|75.9218|11|0.086|south|0|moderate|0.03|0.77
Kozhikode|Kerala|tier3|11.2588|75.7804|11|0.084|south|1|heavy|0.01|0.58
Kurnool|Andhra Pradesh|tier3|15.8281|78.0373|11|0.082|south|0|moderate|0.03|0.86
Rajahmundry|Andhra Pradesh|tier3|17.0005|81.804|11|0.08|south|0|heavy|0.03|0.76
Bokaro|Jharkhand|tier3|23.6693|86.1511|11|0.078|east|0|moderate|0.42|0.77
South Dumdum|West Bengal|tier3|22.6102|88.4018|10|0.076|east|0|heavy|0.42|0.7
Bellary|Karnataka|tier3|15.1394|76.9214|10|0.074|south|0|light|0.03|0.89
Patiala|Punjab|tier3|30.3398|76.3869|10|0.072|north|0|moderate|0.8|0.77
Gopalpur|Odisha|tier3|19.2586|84.9052|10|0.07|east|1|heavy|0.08|0.74
Agartala|Tripura|tier3|23.8315|91.2868|10|0.068|east|0|heavy|0.24|0.68
Bhagalpur|Bihar|tier3|25.2425|86.9842|10|0.066|east|0|moderate|0.62|0.79
Muzaffarpur|Bihar|tier3|26.1209|85.3647|10|0.064|east|0|heavy|0.66|0.78
Bhatpara|West Bengal|tier3|22.8664|88.4011|10|0.062|east|0|heavy|0.42|0.71
Panihati|West Bengal|tier3|22.6909|88.374|10|0.06|east|0|heavy|0.42|0.7
Latur|Maharashtra|tier3|18.4088|76.5604|10|0.058|central|0|light|0.06|0.91
Dhule|Maharashtra|tier3|20.9042|74.7749|10|0.056|west|0|moderate|0.08|0.86`;

const cities = CITY_CSV.split("\n").slice(0, 100).map((line) => {
  const [city, state, tier, centerLat, centerLng, radiusKm, weight, region, coastal, monsoon, northIntensity, heatIntensity] = line.split("|");
  return {
    city,
    state,
    tier,
    centerLat: Number(centerLat),
    centerLng: Number(centerLng),
    radiusKm: Number(radiusKm),
    weight: Number(weight),
    region,
    coastal: coastal === "1",
    monsoon,
    northIntensity: Number(northIntensity),
    heatIntensity: Number(heatIntensity)
  };
});

module.exports = { cities };
