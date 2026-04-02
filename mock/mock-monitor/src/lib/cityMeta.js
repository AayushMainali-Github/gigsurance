const CITY_CSV = `Mumbai|Maharashtra|tier1|19.076|72.8777
Delhi|Delhi|tier1|28.6139|77.209
Bengaluru|Karnataka|tier1|12.9716|77.5946
Hyderabad|Telangana|tier1|17.385|78.4867
Chennai|Tamil Nadu|tier1|13.0827|80.2707
Kolkata|West Bengal|tier1|22.5726|88.3639
Pune|Maharashtra|tier1|18.5204|73.8567
Ahmedabad|Gujarat|tier1|23.0225|72.5714
Jaipur|Rajasthan|tier2|26.9124|75.7873
Surat|Gujarat|tier2|21.1702|72.8311
Lucknow|Uttar Pradesh|tier2|26.8467|80.9462
Kanpur|Uttar Pradesh|tier2|26.4499|80.3319
Nagpur|Maharashtra|tier2|21.1458|79.0882
Patna|Bihar|tier2|25.5941|85.1376
Indore|Madhya Pradesh|tier2|22.7196|75.8577
Bhopal|Madhya Pradesh|tier2|23.2599|77.4126
Visakhapatnam|Andhra Pradesh|tier2|17.6868|83.2185
Coimbatore|Tamil Nadu|tier2|11.0168|76.9558
Thane|Maharashtra|tier2|19.2183|72.9781
Vadodara|Gujarat|tier2|22.3072|73.1812
Ludhiana|Punjab|tier2|30.901|75.8573
Agra|Uttar Pradesh|tier2|27.1767|78.0081
Nashik|Maharashtra|tier2|19.9975|73.7898
Faridabad|Haryana|tier2|28.4089|77.3178
Meerut|Uttar Pradesh|tier2|28.9845|77.7064
Rajkot|Gujarat|tier2|22.3039|70.8022
Varanasi|Uttar Pradesh|tier2|25.3176|82.9739
Srinagar|Jammu and Kashmir|tier2|34.0837|74.7973
Aurangabad|Maharashtra|tier2|19.8762|75.3433
Dhanbad|Jharkhand|tier2|23.7957|86.4304
Amritsar|Punjab|tier2|31.634|74.8723
Allahabad|Uttar Pradesh|tier2|25.4358|81.8463
Ranchi|Jharkhand|tier2|23.3441|85.3096
Howrah|West Bengal|tier2|22.5958|88.2636
Jabalpur|Madhya Pradesh|tier2|23.1815|79.9864
Gwalior|Madhya Pradesh|tier2|26.2183|78.1828
Vijayawada|Andhra Pradesh|tier2|16.5062|80.648
Jodhpur|Rajasthan|tier2|26.2389|73.0243
Madurai|Tamil Nadu|tier2|9.9252|78.1198
Raipur|Chhattisgarh|tier2|21.2514|81.6296
Kota|Rajasthan|tier2|25.2138|75.8648
Guwahati|Assam|tier2|26.1445|91.7362
Chandigarh|Chandigarh|tier2|30.7333|76.7794
Solapur|Maharashtra|tier2|17.6599|75.9064
Hubli|Karnataka|tier2|15.3647|75.124
Bareilly|Uttar Pradesh|tier2|28.367|79.4304
Mysuru|Karnataka|tier2|12.2958|76.6394
Tiruchirappalli|Tamil Nadu|tier2|10.7905|78.7047
Salem|Tamil Nadu|tier2|11.6643|78.146
Aligarh|Uttar Pradesh|tier3|27.8974|78.088
Moradabad|Uttar Pradesh|tier3|28.8386|78.7733
Bhiwandi|Maharashtra|tier3|19.2813|73.0483
Saharanpur|Uttar Pradesh|tier3|29.968|77.5552
Gorakhpur|Uttar Pradesh|tier3|26.7606|83.3732
Bikaner|Rajasthan|tier3|28.0229|73.3119
Amravati|Maharashtra|tier3|20.9374|77.7796
Noida|Uttar Pradesh|tier3|28.5355|77.391
Jamshedpur|Jharkhand|tier3|22.8046|86.2029
Bhilai|Chhattisgarh|tier3|21.1938|81.3509
Cuttack|Odisha|tier3|20.4625|85.8828
Firozabad|Uttar Pradesh|tier3|27.1591|78.3957
Kochi|Kerala|tier3|9.9312|76.2673
Nellore|Andhra Pradesh|tier3|14.4426|79.9865
Bhavnagar|Gujarat|tier3|21.7645|72.1519
Dehradun|Uttarakhand|tier3|30.3165|78.0322
Durgapur|West Bengal|tier3|23.5204|87.3119
Asansol|West Bengal|tier3|23.6739|86.9524
Rourkela|Odisha|tier3|22.2604|84.8536
Nanded|Maharashtra|tier3|19.1383|77.321
Kolhapur|Maharashtra|tier3|16.705|74.2433
Ajmer|Rajasthan|tier3|26.4499|74.6399
Akola|Maharashtra|tier3|20.7096|77.0027
Gulbarga|Karnataka|tier3|17.3297|76.8343
Jamnagar|Gujarat|tier3|22.4707|70.0577
Ujjain|Madhya Pradesh|tier3|23.1765|75.7885
Loni|Uttar Pradesh|tier3|28.7333|77.2833
Siliguri|West Bengal|tier3|26.7271|88.3953
Jhansi|Uttar Pradesh|tier3|25.4484|78.5685
Ulhasnagar|Maharashtra|tier3|19.2215|73.1645
Jammu|Jammu and Kashmir|tier3|32.7266|74.857
Sangli|Maharashtra|tier3|16.8524|74.5815
Mangalore|Karnataka|tier3|12.9141|74.856
Erode|Tamil Nadu|tier3|11.341|77.7172
Belgaum|Karnataka|tier3|15.8497|74.4977
Ambattur|Tamil Nadu|tier3|13.1143|80.1548
Tirunelveli|Tamil Nadu|tier3|8.7139|77.7567
Malegaon|Maharashtra|tier3|20.5579|74.5089
Gaya|Bihar|tier3|24.7914|85.0002
Jalgaon|Maharashtra|tier3|21.0077|75.5626
Udaipur|Rajasthan|tier3|24.5854|73.7125
Maheshtala|West Bengal|tier3|22.5086|88.2532
Davanagere|Karnataka|tier3|14.4644|75.9218
Kozhikode|Kerala|tier3|11.2588|75.7804
Kurnool|Andhra Pradesh|tier3|15.8281|78.0373
Rajahmundry|Andhra Pradesh|tier3|17.0005|81.804
Bokaro|Jharkhand|tier3|23.6693|86.1511
South Dumdum|West Bengal|tier3|22.6102|88.4018
Bellary|Karnataka|tier3|15.1394|76.9214
Patiala|Punjab|tier3|30.3398|76.3869
Gopalpur|Odisha|tier3|19.2586|84.9052
Agartala|Tripura|tier3|23.8315|91.2868
Bhagalpur|Bihar|tier3|25.2425|86.9842`;

export const cityMeta = CITY_CSV.split('\n').map((line) => {
  const [city, state, tier, lat, lng] = line.split('|');
  return { city, state, tier, centerLat: Number(lat), centerLng: Number(lng) };
});
