var app = angular.module('reportingApp', ['dndLists']);

app.directive('reportingTool', function () {
    return {
        restrict: 'E',
        scope: {
            datasets: '='
        },
        template: `
    <div class="app-container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <h3><i class="fas fa-database"></i> Datasets</h3>
            <ul class="dataset-list">
                <li ng-repeat="ds in datasets">
                    <label>
                        <input type="radio" ng-model="$parent.selectedDatasetId" ng-value="ds.id" ng-change="updateSelectedDataset(ds.id)">
                        {{ ds.name }}
                    </label>
                </li>
            </ul>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <div class="container">
                <h1><i class="fas fa-chart-bar"></i> Dynamic Reporting Tool</h1>

                <!-- Group By Area -->
                <div class="drop-zone" dnd-list="groupedColumns" dnd-drop="onDrop(item)">
                    <div class="placeholder" ng-if="groupedColumns.length === 0">
                        Drag column headers here to group by that column
                    </div>
                    <div class="grouped-column" ng-repeat="col in groupedColumns" dnd-draggable="col"
                        dnd-moved="groupedColumns.splice($index, 1); updateGrouping()" dnd-effect-allowed="move">
                        {{ col.label }}
                        <span class="remove-btn" ng-click="removeGroup($index)">&times;</span>
                    </div>
                </div>

                <div class="toolbar">
                    <!-- Search Bar -->
                    <div class="search-bar">
                        <input type="text" ng-model="searchQuery" ng-change="processData()"
                            ng-model-options="{ debounce: 300 }" placeholder="Search...">
                    </div>
                    
                    <!-- Export Button -->
                    <button ng-click="exportToExcel()" class="btn-export" title="Export to Excel">
                        <i class="fas fa-file-excel"></i> Export to Excel
                    </button>
                </div>

                <!-- Reporting Table -->
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th ng-repeat="col in availableColumns" dnd-draggable="col" dnd-effect-allowed="copy"
                                    ng-class="{'sticky-col': $first}" ng-style="{'text-align': col.isNumeric ? 'right' : 'left'}">
                                    {{ col.label }}
                                    <span ng-show="sortField === col.field">
                                        <i class="fas" ng-class="sortReverse ? 'fa-sort-up' : 'fa-sort-down'"></i>
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody ng-repeat="row in pagedData">
                            <!-- Grouped Data Rendering -->
                            <tr ng-if="row.isGroup" class="group-header" ng-click="toggleGroup(row)">
                                <td colspan="{{ availableColumns.length }}">
                                    <span class="group-indent" ng-style="{ 'padding-left': (row.level * 20) + 'px' }">
                                        <i class="fas"
                                            ng-class="row.expanded ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                                    </span>
                                    {{ row.groupField }}: {{ row.groupValue }} ({{ row.count }} items)
                                </td>
                            </tr>
                            <tr ng-if="!row.isGroup && !row.isSummary && row.visible">
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': $first}" ng-style="{'text-align': col.isNumeric ? 'right' : 'left'}">
                                    {{ row[col.field] }}
                                </td>
                            </tr>
                            <!-- Summary Row -->
                            <tr ng-if="row.isSummary" style="background-color: #fce4ec; font-weight: bold;">
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': $first}" ng-style="{'text-align': col.isNumeric ? 'right' : 'left'}">
                                    <span ng-if="$first" style="float: right; margin-right: 10px;">Total:</span>
                                    <span ng-if="col.hasTotal">{{ (row.sums[col.field] || 0) | number:2 }}</span>
                                </td>
                            </tr>
                        </tbody>
                        <tbody ng-if="pagedData.length === 0">
                            <!-- Fallback for no data -->
                            <tr>
                                <td colspan="{{ availableColumns.length }}" style="text-align: center;">No data
                                    available</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #e3f2fd; font-weight: bold; border-top: 2px solid #aaa;">
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': $first}" ng-style="{'text-align': col.isNumeric ? 'right' : 'left'}">
                                    <span ng-if="$first">Grand Total:</span>
                                    <span ng-if="col.hasTotal">{{ (grandTotals[col.field] || 0) | number:2 }}</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <!-- Pagination Controls -->
                <div class="pagination-controls"
                    style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
                    <div>
                        <button ng-click="prevPage()" ng-disabled="currentPage === 1"
                            style="padding: 5px 10px; cursor: pointer;">Previous</button>
                        <span style="margin: 0 10px;">Page {{currentPage}} of {{totalPages}}</span>
                        <button ng-click="nextPage()" ng-disabled="currentPage === totalPages"
                            style="padding: 5px 10px; cursor: pointer;">Next</button>
                    </div>
                    <div>
                        <label>Items per page:
                            <select ng-model="pageSize" ng-change="updatePagination()"
                                ng-options="size for size in [5, 10, 20, 50]"
                                style="padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        </main>
    </div>
        `,
        controller: ['$scope', '$filter', function ($scope, $filter) {
            // Configuration
            $scope.availableColumns = [
                { field: 'id', label: 'ID' },
                { field: 'product', label: 'Product' },
                { field: 'category', label: 'Category' },
                { field: 'region', label: 'Region' },
                { field: 'amount', label: 'Amount', hasTotal: true },
                { field: 'date', label: 'Date' },
                // New Columns
                { field: 'supplier', label: 'Supplier' },
                { field: 'rating', label: 'Rating', hasTotal: true },
                { field: 'delivery_time', label: 'Delivery Time', hasTotal: true },
                { field: 'sku', label: 'SKU' },
                { field: 'discount', label: 'Discount', hasTotal: true },
                { field: 'tax', label: 'Tax', hasTotal: true },
                { field: 'total', label: 'Total', hasTotal: true },
                { field: 'notes', label: 'Notes' }
            ];

            $scope.rawData = [];
            $scope.groupedData = [];
            $scope.groupedColumns = [];

            $scope.sortField = 'id';
            $scope.sortReverse = false;
            $scope.searchQuery = '';

            $scope.selectedDatasetId = null;

            $scope.updateSelectedDataset = function (id) {
                $scope.selectedDatasetId = id;
                var selected = $scope.datasets.find(function (ds) { return ds.id === id; });

                $scope.groupedColumns = [];

                if (selected) {
                    $scope.rawData = angular.copy(selected.data);
                    $scope.updateAvailableColumns();
                    $scope.processData();
                } else {
                    $scope.rawData = [];
                    $scope.availableColumns = [];
                }
            };

            $scope.updateAvailableColumns = function () {
                if ($scope.rawData.length === 0) {
                    $scope.availableColumns = [];
                    return;
                }

                // Helper to format label (snake_case to Title Case)
                var formatLabel = function (key) {
                    return key.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\w\S*/g, function (txt) {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    });
                };

                // Analyze data types to determine hasTotal
                var fieldTypes = {};
                var sampleSize = Math.min($scope.rawData.length, 5);

                var keys = Object.keys($scope.rawData[0]);

                keys.forEach(function (key) {
                    var isNumeric = true;
                    for (var i = 0; i < sampleSize; i++) {
                        var val = $scope.rawData[i][key];
                        // If any non-null value is not a number, it's not a numeric field
                        if (val !== null && val !== undefined && val !== '' && isNaN(val)) {
                            isNumeric = false;
                            break;
                        }
                    }
                    fieldTypes[key] = isNumeric;
                });

                // Exclude internal angular keys if any
                $scope.availableColumns = keys.filter(function (k) {
                    return k !== 'visible' && k !== 'isGroup' && k !== '$$hashKey';
                }).map(function (k) {
                    // Auto-detect hasTotal: numeric AND not an ID field
                    var autoHasTotal = fieldTypes[k] && k.toLowerCase().indexOf('id') === -1;

                    return {
                        field: k,
                        label: formatLabel(k),
                        hasTotal: autoHasTotal,
                        isNumeric: fieldTypes[k]
                    };
                });
            };

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
                }

                // 1. Sort
                data = $filter('orderBy')(data, $scope.sortField, $scope.sortReverse);

                // Calculate Grand Totals
                $scope.grandTotals = {};
                // Initialize
                $scope.availableColumns.forEach(function (col) {
                    if (col.hasTotal) $scope.grandTotals[col.field] = 0;
                });

                data.forEach(function (item) {
                    $scope.availableColumns.forEach(function (col) {
                        if (col.hasTotal && item[col.field] && !isNaN(item[col.field])) {
                            $scope.grandTotals[col.field] += parseFloat(item[col.field]);
                        }
                    });
                });

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
                            count: 0,
                            sums: {}
                        };
                        // Initialize sums
                        $scope.availableColumns.forEach(function (col) {
                            if (col.hasTotal) {
                                groups[value].sums[col.field] = 0;
                            }
                        });
                    }
                    groups[value].items.push(item);
                    groups[value].count++;

                    // Accumulate Sums
                    $scope.availableColumns.forEach(function (col) {
                        if (col.hasTotal && item[col.field] && !isNaN(item[col.field])) {
                            groups[value].sums[col.field] += parseFloat(item[col.field]);
                        }
                    });
                });

                var result = [];
                for (var key in groups) {
                    var group = groups[key];
                    group.items = groupDataRecursive(group.items, level + 1);

                    // Round decimals
                    for (var field in group.sums) {
                        group.sums[field] = Math.round(group.sums[field] * 100) / 100;
                    }

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

                        // Add Summary Row after the group contents (only if expanded)
                        flat.push({
                            isSummary: true,
                            level: group.level,
                            sums: group.sums
                        });
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

                                // Add Group Summary Row
                                var summaryRow = $scope.availableColumns.map(function (col, index) {
                                    if (index === 0) return "Total";
                                    if (col.hasTotal) return node.sums[col.field];
                                    return "";
                                });
                                sheetData.push(summaryRow);
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

                // Add Grand Totals Row
                var exportTotals = {};
                // Initialize totals
                $scope.availableColumns.forEach(function (col) {
                    if (col.hasTotal) exportTotals[col.field] = 0;
                });

                // Calculate totals
                data.forEach(function (item) {
                    $scope.availableColumns.forEach(function (col) {
                        if (col.hasTotal && item[col.field] && !isNaN(item[col.field])) {
                            exportTotals[col.field] += parseFloat(item[col.field]);
                        }
                    });
                });

                var grandTotalRow = $scope.availableColumns.map(function (col, index) {
                    if (index === 0) return "Grand Total";
                    if (col.hasTotal) return exportTotals[col.field];
                    return "";
                });

                sheetData.push([]); // Empty row
                sheetData.push(grandTotalRow);

                // 3. Create Sheet
                var ws = XLSX.utils.aoa_to_sheet(sheetData);
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Report");

                // 4. Save file
                XLSX.writeFile(wb, "Report_Export_" + new Date().toISOString().slice(0, 10) + ".xlsx");
            };

            // Initial processing
            // Initialize with the first available dataset or the one marked selected
            if ($scope.datasets && $scope.datasets.length > 0) {
                var initial = $scope.datasets.find(function (ds) { return ds.selected; }) || $scope.datasets[0];
                $scope.updateSelectedDataset(initial.id);
            }

            // Watch for dataset changes
            $scope.$watch('datasets', function (newVal) {
                if (newVal && newVal.length > 0 && !$scope.selectedDatasetId) {
                    var initial = newVal.find(function (ds) { return ds.selected; }) || newVal[0];
                    $scope.updateSelectedDataset(initial.id);
                }
            }, true);

        }]
    };
});

app.controller('ReportController', ['$scope', function ($scope) {

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

}]);
