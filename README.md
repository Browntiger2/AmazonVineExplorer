# Amazon Vine Explorer

Private fork of https://github.com/Amazon-Vine-Explorer/AmazonVineExplorer
browntiger @ gmail

Following improvement were added
1: Tax resolver - fully functional, resolves visible items taxes. Not all taxes for 35000 items 
2: Removed pointless cleanup database every 20 minutes
3: Added probability tax resolver
4: Added #database.update(false) to stop terrorizing indexedDb
5: Generate the correct first page url for scanning
6: Added national tax formatter
7: Added reset scanner from page one *if* it was offline for an hour.
8: Corrected the syntax error when opening IndexedDb
