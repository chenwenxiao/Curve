# CSV Explanation

The csv file should be described with column `timestamp` and `label`, but they are not neccessary because if you lose them we will fill them with default. `timestmap` will be an auto-increment array - $[0, 1, 2, 3, 4, \ldots]$, and `label` will be all the 0. 

The unit of `timestamp` is describe in LabelServer/config.js - `multiple`. And the label should be 0 or 1.

Notice that the `timestamp` don't need to be a ordered series (maybe [0, 3, 2, 1], but we will sort it to [0, 1, 2, 3] in database) but should be unique.