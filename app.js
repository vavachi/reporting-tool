var app = angular.module('reportingApp', ['dndLists']);

app.controller('ReportController', ['$scope', '$http', '$filter', function ($scope, $http, $filter) {

    // Configuration
    $scope.availableColumns = [
        { field: 'id', label: 'ID' },
        { field: 'product', label: 'Product' },
        { field: 'category', label: 'Category' },
        { field: 'region', label: 'Region' },
        { field: 'amount', label: 'Amount' },
        { field: 'date', label: 'Date' },
        // New Columns
        { field: 'supplier', label: 'Supplier' },
        { field: 'rating', label: 'Rating' },
        { field: 'delivery_time', label: 'Delivery Time' },
        { field: 'sku', label: 'SKU' },
        { field: 'discount', label: 'Discount' },
        { field: 'tax', label: 'Tax' },
        { field: 'total', label: 'Total' },
        { field: 'notes', label: 'Notes' }
    ];

    $scope.rawData = [];
    $scope.groupedData = [];
    $scope.groupedColumns = [];

    $scope.sortField = 'id';
    $scope.sortReverse = false;
    $scope.searchQuery = '';

    // Mock Data Sets
    $scope.datasets = [
        {
            id: 'sales',
            name: 'Sales Data',
            selected: true,
            data: [
                { "id": 1, "product": "Laptop", "category": "Electronics", "region": "North", "amount": 1200, "date": "2023-01-15", "supplier": "TechCorp", "rating": 4.5, "delivery_time": "2 days", "sku": "TC-LAP-001", "discount": 50, "tax": 120, "total": 1270, "notes": "Express delivery requested" },
                { "id": 2, "product": "Mouse", "category": "Electronics", "region": "North", "amount": 25, "date": "2023-01-16", "supplier": "PeriphsInc", "rating": 4.2, "delivery_time": "3 days", "sku": "PI-MSE-023", "discount": 0, "tax": 2.5, "total": 27.5, "notes": "" },
                { "id": 3, "product": "Keyboard", "category": "Electronics", "region": "South", "amount": 45, "date": "2023-01-17", "supplier": "ClickyKeys", "rating": 4.8, "delivery_time": "5 days", "sku": "CK-KBD-101", "discount": 5, "tax": 4.5, "total": 44.5, "notes": "Gift wrapped" },
                { "id": 4, "product": "Chair", "category": "Furniture", "region": "North", "amount": 150, "date": "2023-01-18", "supplier": "ComfySeating", "rating": 4.0, "delivery_time": "1 week", "sku": "CS-CHR-500", "discount": 10, "tax": 15, "total": 155, "notes": "Leave at front door" },
                { "id": 5, "product": "Desk", "category": "Furniture", "region": "South", "amount": 300, "date": "2023-01-19", "supplier": "OfficeDepot", "rating": 4.6, "delivery_time": "2 weeks", "sku": "OD-DSK-900", "discount": 20, "tax": 30, "total": 310, "notes": "Heavy item" },
                { "id": 6, "product": "Laptop", "category": "Electronics", "region": "East", "amount": 1150, "date": "2023-01-20", "supplier": "TechCorp", "rating": 4.5, "delivery_time": "2 days", "sku": "TC-LAP-001", "discount": 0, "tax": 115, "total": 1265, "notes": "" },
                { "id": 7, "product": "Mouse", "category": "Electronics", "region": "West", "amount": 30, "date": "2023-01-21", "supplier": "PeripshInc", "rating": 3.9, "delivery_time": "4 days", "sku": "PI-MSE-024", "discount": 2, "tax": 3, "total": 31, "notes": "" },
                { "id": 8, "product": "Headphones", "category": "Electronics", "region": "East", "amount": 80, "date": "2023-01-22", "supplier": "SoundWaves", "rating": 4.9, "delivery_time": "1 day", "sku": "SW-HP-777", "discount": 10, "tax": 8, "total": 78, "notes": "Fragile" },
                { "id": 9, "product": "Monitor", "category": "Electronics", "region": "West", "amount": 200, "date": "2023-01-23", "supplier": "ViewTech", "rating": 4.3, "delivery_time": "3 days", "sku": "VT-MON-240", "discount": 15, "tax": 20, "total": 205, "notes": "" },
                { "id": 10, "product": "Chair", "category": "Furniture", "region": "East", "amount": 160, "date": "2023-01-24", "supplier": "ComfySeating", "rating": 4.1, "delivery_time": "1 week", "sku": "CS-CHR-500", "discount": 0, "tax": 16, "total": 176, "notes": "" }
            ]
        },
        {
            id: 'inventory',
            name: 'Inventory Data',
            selected: false,
            data: [
                { "product": "Laptop", "region": "North", "stock": 50, "warehouse": "Main" },
                { "product": "Mouse", "region": "North", "stock": 200, "warehouse": "Main" },
                { "product": "Keyboard", "region": "South", "stock": 150, "warehouse": "Secondary" },
                { "product": "Chair", "region": "North", "stock": 30, "warehouse": "Main" },
                { "product": "Desk", "region": "South", "stock": 15, "warehouse": "Secondary" },
                { "product": "Headphones", "region": "East", "stock": 100, "warehouse": "Main" },
                { "product": "Monitor", "region": "West", "stock": 60, "warehouse": "Secondary" }
            ]
        }
    ];

    $scope.rawData = []; // Will be populated based on selection
    $scope.selectedDatasets = [];
    $scope.showJoinConfig = false;
    $scope.commonColumns = [];
    $scope.joinKey = '';

    $scope.selectedJoinKeys = {};

    $scope.updateSelectedDatasets = function () {
        $scope.selectedDatasets = $scope.datasets.filter(function (ds) {
            return ds.selected;
        });

        if ($scope.selectedDatasets.length === 0) {
            $scope.rawData = [];
            $scope.showJoinConfig = false;
        } else if ($scope.selectedDatasets.length === 1) {
            $scope.rawData = angular.copy($scope.selectedDatasets[0].data);
            $scope.showJoinConfig = false;
            $scope.updateAvailableColumns();
        } else {
            // Multiple selected, show join config
            $scope.showJoinConfig = true;
            $scope.identifyCommonColumns();
        }
        $scope.processData();
    };

    $scope.identifyCommonColumns = function () {
        if ($scope.selectedDatasets.length < 2) return;

        // Find intersection of keys
        var keys1 = Object.keys($scope.selectedDatasets[0].data[0]);
        var keys2 = Object.keys($scope.selectedDatasets[1].data[0]);

        $scope.commonColumns = keys1.filter(function (n) {
            return keys2.indexOf(n) !== -1;
        });

        $scope.selectedJoinKeys = {};
        if ($scope.commonColumns.length > 0) {
            // Default to first common column
            $scope.selectedJoinKeys[$scope.commonColumns[0]] = true;
        }
    };

    $scope.addJoinKey = function (key) {
        if (key) {
            $scope.selectedJoinKeys[key] = true;
        }
    };

    $scope.removeJoinKey = function (key) {
        if (key) {
            $scope.selectedJoinKeys[key] = false;
        }
    };

    $scope.mergeDatasets = function () {
        // Get selected keys
        var joinKeys = Object.keys($scope.selectedJoinKeys).filter(function (k) {
            return $scope.selectedJoinKeys[k];
        });

        if (joinKeys.length === 0 || $scope.selectedDatasets.length < 2) return;

        var primary = $scope.selectedDatasets[0].data;
        var secondary = $scope.selectedDatasets[1].data;

        // Helper to create composite key
        var getCompositeKey = function (item) {
            return joinKeys.map(function (k) { return item[k]; }).join('|');
        };

        // Perform Left Join (Primary + Secondary matching)
        // Index secondary by composite key for faster lookup
        var secondaryMap = {};
        angular.forEach(secondary, function (item) {
            secondaryMap[getCompositeKey(item)] = item;
        });

        var merged = primary.map(function (item) {
            var match = secondaryMap[getCompositeKey(item)];
            if (match) {
                return angular.extend({}, item, match);
            }
            return angular.copy(item);
        });

        $scope.rawData = merged;
        $scope.updateAvailableColumns();
        $scope.processData();
    };

    $scope.updateAvailableColumns = function () {
        if ($scope.rawData.length === 0) {
            $scope.availableColumns = [];
            return;
        }

        var keys = Object.keys($scope.rawData[0]);
        // Exclude internal angular keys if any
        $scope.availableColumns = keys.filter(function (k) {
            return k !== 'visible' && k !== 'isGroup' && k !== '$$hashKey';
        }).map(function (k) {
            return { field: k, label: k.charAt(0).toUpperCase() + k.slice(1) };
        });
    };

    // Initial processing


    /* 
    // Original $http call - commented out for file:// compatibility
    $http.get('data.json').then(function(response) {
        $scope.rawData = response.data;
        $scope.processData();
    }, function(error) {
        console.error('Error fetching data:', error);
    });
    */

    // Sorting Logic
    $scope.sortBy = function (field) {
        if ($scope.sortField === field) {
            $scope.sortReverse = !$scope.sortReverse;
        } else {
            $scope.sortField = field;
            $scope.sortReverse = false;
        }
        $scope.processData();
    };

    // Grouping Logic
    $scope.onDrop = function (item) {
        // Check if already grouped
        var exists = $scope.groupedColumns.some(function (col) {
            return col.field === item.field;
        });

        if (!exists) {
            $scope.groupedColumns.push(item);
            $scope.updateGrouping();
        }
        return true;
    };

    $scope.removeGroup = function (index) {
        $scope.groupedColumns.splice(index, 1);
        $scope.updateGrouping();
    };

    $scope.updateGrouping = function () {
        $scope.processData();
    };

    $scope.toggleGroup = function (groupRow) {
        groupRow.expanded = !groupRow.expanded;
        // We need to toggle visibility of children
        // This is a simplified approach. For deep nesting, we need recursive logic.
        // But since we are flattening the list for display, we can just iterate the list
        // and show/hide items that belong to this group.

        // However, with a flattened list approach for groups, "children" are just subsequent rows 
        // until the next group of the same level or higher.

        var startIndex = $scope.groupedData.indexOf(groupRow);
        if (startIndex === -1) return;

        for (var i = startIndex + 1; i < $scope.groupedData.length; i++) {
            var row = $scope.groupedData[i];

            // If we hit a group at the same level or higher (lower level number), stop
            if (row.isGroup && row.level <= groupRow.level) {
                break;
            }

            // If we are collapsing, hide everything under it
            if (!groupRow.expanded) {
                row.visible = false;
                if (row.isGroup) row.expanded = false; // Collapse sub-groups too
            } else {
                // If expanding, only show direct children (items) or immediate sub-groups
                // For items: always show if parent is expanded
                // For sub-groups: always show if parent is expanded
                // BUT, we must respect the sub-group's expanded state for ITS children.

                // Simplified: Just re-process data to reset visibility based on expanded states
                // Ideally we'd traverse, but re-processing is robust.
                // Let's try a smarter traversal for performance if needed, but for now:
                // We will just re-run processData but that resets expansion states unless we persist them.
                // Better: Just set visibility based on parent.

                // Actually, let's just use a recursive helper in processData to build the flat list
                // based on current expansion state.
                // So toggleGroup just flips the flag and calls processData.
            }
        }
        $scope.processData(); // Re-build the view
    };

    // Pagination State
    $scope.currentPage = 1;
    $scope.pageSize = 10;
    $scope.totalPages = 1;
    $scope.pagedData = [];

    // Core Data Processing
    $scope.processData = function () {
        var data = angular.copy($scope.rawData);

        // 0. Filter
        if ($scope.searchQuery) {
            data = $filter('filter')(data, $scope.searchQuery);
        } else {
            // If search is cleared, ensure we go back to full rawData
            // (Already handled by copy above, but logic flow is clearer)
        }

        // 1. Sort
        data = $filter('orderBy')(data, $scope.sortField, $scope.sortReverse);

        // 2. Group
        if ($scope.groupedColumns.length > 0) {
            $scope.groupedData = flattenGroups(groupDataRecursive(data, 0));
        } else {
            // No grouping, just flat data
            $scope.groupedData = data.map(function (item) {
                item.visible = true;
                item.isGroup = false;
                return item;
            });
        }

        // 3. Paginate
        $scope.updatePagination();
    };

    $scope.updatePagination = function () {
        $scope.totalPages = Math.ceil($scope.groupedData.length / $scope.pageSize);

        // Ensure current page is valid
        if ($scope.currentPage > $scope.totalPages) {
            $scope.currentPage = $scope.totalPages || 1;
        }
        if ($scope.currentPage < 1) {
            $scope.currentPage = 1;
        }

        var start = ($scope.currentPage - 1) * $scope.pageSize;
        var end = start + $scope.pageSize;

        $scope.pagedData = $scope.groupedData.slice(start, end);
    };

    $scope.prevPage = function () {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.updatePagination();
        }
    };

    $scope.nextPage = function () {
        if ($scope.currentPage < $scope.totalPages) {
            $scope.currentPage++;
            $scope.updatePagination();
        }
    };

    // Helper to group data recursively
    function groupDataRecursive(data, level) {
        if (level >= $scope.groupedColumns.length) return data;

        var groupField = $scope.groupedColumns[level].field;
        var groups = {};

        data.forEach(function (item) {
            var value = item[groupField];
            if (!groups[value]) {
                groups[value] = {
                    isGroup: true,
                    groupField: $scope.groupedColumns[level].label,
                    groupValue: value,
                    level: level,
                    expanded: true, // Default expanded
                    items: [],
                    count: 0
                };
            }
            groups[value].items.push(item);
            groups[value].count++;
        });

        var result = [];
        for (var key in groups) {
            var group = groups[key];
            group.items = groupDataRecursive(group.items, level + 1);
            result.push(group);
        }

        // Sort groups by value if needed (optional)
        result.sort(function (a, b) {
            return a.groupValue < b.groupValue ? -1 : 1;
        });

        return result;
    }

    // Helper to flatten groups for display
    function flattenGroups(groups) {
        var flat = [];
        groups.forEach(function (group) {
            // Try to find previous state for expansion
            var existing = findExistingGroup(group);
            if (existing) {
                group.expanded = existing.expanded;
            }

            flat.push(group);
            if (group.expanded) {
                if (group.items[0] && group.items[0].isGroup) {
                    flat = flat.concat(flattenGroups(group.items));
                } else {
                    // Leaf nodes
                    group.items.forEach(function (item) {
                        item.visible = true;
                        item.isGroup = false;
                        flat.push(item);
                    });
                }
            }
        });
        return flat;
    }

    function findExistingGroup(newGroup) {
        if (!$scope.groupedData) return null;
        for (var i = 0; i < $scope.groupedData.length; i++) {
            var row = $scope.groupedData[i];
            if (row.isGroup &&
                row.groupField === newGroup.groupField &&
                row.groupValue === newGroup.groupValue &&
                row.level === newGroup.level) {
                return row;
            }
        }
        return null;
    }



    // Helper for dnd-copied
    $scope.onHeaderDrag = function (col) {
        // This is called when we start dragging a header.
        // We don't need to do much here, dnd-lists handles the data transfer.
        return col;
    };

    // Export to Excel
    $scope.exportToExcel = function () {
        // 1. Get filtered and sorted data
        var data = angular.copy($scope.rawData);

        if ($scope.searchQuery) {
            data = $filter('filter')(data, $scope.searchQuery);
        }

        data = $filter('orderBy')(data, $scope.sortField, $scope.sortReverse);

        var sheetData = [];
        // Header Row
        var headers = $scope.availableColumns.map(function (c) { return c.label; });
        sheetData.push(headers);

        if ($scope.groupedColumns.length > 0) {
            // Re-group to get the tree structure (ignoring current expansion state, want full export)
            var groups = groupDataRecursive(data, 0);

            // Helper to traverse and build AoA
            var traverse = function (nodes, indent) {
                nodes.forEach(function (node) {
                    if (node.isGroup) {
                        // Add Group Header Row
                        var indentStr = "    ".repeat(indent);
                        var row = [indentStr + node.groupField + ": " + node.groupValue + " (" + node.count + ")"];
                        sheetData.push(row);
                        traverse(node.items, indent + 1);
                    } else {
                        // Leaf Item
                        var row = $scope.availableColumns.map(function (col) {
                            return node[col.field];
                        });
                        sheetData.push(row);
                    }
                });
            };
            traverse(groups, 0);

        } else {
            // Flat Export
            data.forEach(function (item) {
                var row = $scope.availableColumns.map(function (col) {
                    return item[col.field];
                });
                sheetData.push(row);
            });
        }

        // 3. Create Sheet
        var ws = XLSX.utils.aoa_to_sheet(sheetData);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");

        // 4. Save file
        XLSX.writeFile(wb, "Report_Export_" + new Date().toISOString().slice(0, 10) + ".xlsx");
    };

    // Initial processing
    $scope.updateSelectedDatasets();

}]);
