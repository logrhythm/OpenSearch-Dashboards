import requests
logFile = open('/var/log/probe/OSDStartup.log', 'a')
res = requests.get('http://localhost:9200/_cat/indices/.opensearch_dashboards_*')
content = res.content.decode()
osdIndices = []
for indexData in content.split(" "):
   if ".opensearch_dashboards" in indexData:
      osdIndices.append(indexData)
osdIndices = sorted(osdIndices, key=lambda index: int(index.split("_")[3]))
osdIndices = osdIndices[:-1]
print("Deleting indices: {}".format(osdIndices), file=logFile)
for index in osdIndices:
   url = "http://localhost:9200/{}".format(index)
   res = requests.delete(url)
   if res.status_code != 200:
      print("Could not delete {}".format(url), file=logFile)
logFile.close()
