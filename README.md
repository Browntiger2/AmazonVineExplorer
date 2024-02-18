# Amazon Vine Explorer

Private fork of https://github.com/Amazon-Vine-Explorer/AmazonVineExplorer__
browntiger @ gmail__

Following improvement were added:__
1: Tax resolver - fully functional, resolves visible items taxes. Not all taxes for 35000 items. __
2: Removed pointless cleanup database every 20 minutes.__
3: Added probability tax resolver.__
4: Added #database.update(false) to stop terrorizing indexedDb.__
5: Generate the correct first page url for scanning.__
6: Added national tax formatter.__
7: Added reset scanner from page one *if* it was offline for an hour.__
8: Corrected the syntax error when opening IndexedDb.__
