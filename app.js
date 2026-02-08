var app = angular.module('reportingApp', ['dndLists']);

app.directive('reportingTool', function () {
    return {
        restrict: 'E',
        scope: {
            data: '<' // One-way binding
        },
        template: `
            <div class="container">
                <h1><i class="fas fa-chart-bar"></i> Dynamic Reporting Tool</h1>

                <!-- Frozen Columns Area -->
                <div class="drop-zone" dnd-list="frozenColumns" dnd-drop="onDropFrozen(item)">
                    <div class="placeholder" ng-if="frozenColumns.length === 0">
                        Drag column headers here to freeze them to the left
                    </div>
                    <div class="grouped-column" ng-repeat="col in frozenColumns" dnd-draggable="col"
                        dnd-moved="frozenColumns.splice($index, 1); processData()" dnd-effect-allowed="move"
                        style="background-color: #8e44ad;">
                        <i class="fas fa-snowflake"></i> {{ col.label }}
                        <span class="remove-btn" ng-click="removeFrozen($index)">&times;</span>
                    </div>
                </div>

                <!-- Sort By Area -->
                <div class="drop-zone" dnd-list="sortedColumns" dnd-drop="onDropSort(item)">
                    <div class="placeholder" ng-if="sortedColumns.length === 0">
                        Drag column headers here to sort
                    </div>
                    <div class="grouped-column" ng-repeat="col in sortedColumns" dnd-draggable="col"
                        dnd-moved="sortedColumns.splice($index, 1); processData()" dnd-effect-allowed="move">
                        <span ng-click="toggleSortOrder(col)" style="cursor: pointer;">
                             {{ col.label }} <i class="fas" ng-class="col.reverse ? 'fa-sort-down' : 'fa-sort-up'"></i>
                        </span>
                        <span class="remove-btn" ng-click="removeSort($index)"> &times;</span>
                    </div>
                </div>

                <!-- Filter By Area -->
                <div class="drop-zone" dnd-list="filteredColumns" dnd-drop="onDropFilter(item)">
                    <div class="placeholder" ng-if="filteredColumns.length === 0">
                        Drag column headers here to filter
                    </div>
                    <div class="grouped-column filter-chip" ng-repeat="col in filteredColumns" dnd-draggable="col"
                        dnd-moved="filteredColumns.splice($index, 1); processData()" dnd-effect-allowed="move">
                        {{ col.label }}: 
                        <input type="text" ng-model="col.filterValue" ng-change="processData()" ng-model-options="{debounce: 300}" placeholder="Value..." class="chip-input">
                        <span class="remove-btn" ng-click="removeFilter($index)">&times;</span>
                    </div>
                </div>

                <!-- Group By Area -->
                <div class="drop-zone" dnd-list="groupedColumns" dnd-drop="onDropGroup(item)">
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
                                    ng-class="{'sticky-col': col.frozen}" 
                                    ng-style="{'text-align': col.isNumeric ? 'right' : 'left', 'left': col.stickyLeft + 'px'}">
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
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': col.frozen}" 
                                    ng-style="{'text-align': col.isNumeric ? 'right' : 'left', 'left': col.stickyLeft + 'px'}">
                                    {{ row[col.field] }}
                                </td>
                            </tr>
                            <!-- Summary Row -->
                            <tr ng-if="row.isSummary" style="background-color: #fce4ec; font-weight: bold;">
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': col.frozen}" 
                                    ng-style="{'text-align': col.isNumeric ? 'right' : 'left', 'left': col.stickyLeft + 'px'}">
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
                                <td ng-repeat="col in availableColumns" ng-class="{'sticky-col': col.frozen}" 
                                    ng-style="{'text-align': col.isNumeric ? 'right' : 'left', 'left': col.stickyLeft + 'px'}">
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
        `,
        controller: ['$scope', '$filter', '$timeout', function ($scope, $filter, $timeout) {
            $scope.availableColumns = [];
            $scope.rawData = [];
            $scope.groupedData = [];
            $scope.groupedColumns = [];
            $scope.sortedColumns = [];
            $scope.filteredColumns = [];
            $scope.frozenColumns = [];

            $scope.sortField = 'id';
            $scope.sortReverse = false;
            $scope.searchQuery = '';

            // Watch for data changes from parent
            $scope.$watch('data', function (newData) {
                if (newData) {
                    $scope.rawData = angular.copy(newData);
                    $scope.groupedColumns = [];
                    $scope.sortedColumns = [];
                    $scope.filteredColumns = [];
                    // $scope.frozenColumns = []; // Keep frozen columns configuration
                    $scope.searchQuery = '';
                    $scope.searchQuery = '';
                    $scope.updateAvailableColumns();
                    $scope.processData();
                }
            }, true);

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
                        if (val !== null && val !== undefined && val !== '' && isNaN(val)) {
                            isNumeric = false;
                            break;
                        }
                    }
                    fieldTypes[key] = isNumeric;
                });

                // Sort keys: Frozen columns first, then others
                var frozenFields = $scope.frozenColumns.map(c => c.field);
                var sortedKeys = [];

                // Add frozen keys in order
                frozenFields.forEach(function (fKey) {
                    if (keys.includes(fKey)) sortedKeys.push(fKey);
                });

                // Add remaining keys
                keys.forEach(function (key) {
                    if (!sortedKeys.includes(key)) sortedKeys.push(key);
                });


                $scope.availableColumns = sortedKeys.filter(function (k) {
                    return k !== 'visible' && k !== 'isGroup' && k !== '$$hashKey';
                }).map(function (k) {
                    var autoHasTotal = fieldTypes[k] && k.toLowerCase().indexOf('id') === -1;
                    return {
                        field: k,
                        label: formatLabel(k),
                        hasTotal: autoHasTotal,
                        isNumeric: fieldTypes[k],
                        frozen: frozenFields.includes(k),
                        stickyLeft: 0 // Default, will be updated by recalculateStickyOffsets
                    };
                });

                // Recalculate offsets after render
                $timeout(function () {
                    $scope.recalculateStickyOffsets();
                }, 50);
            };

            $scope.recalculateStickyOffsets = function () {
                // We need to find the headers for the sticky columns
                // Using .table-container to scope the query in case of multiple tables (good practice)
                var container = document.querySelector('.table-container');
                if (!container) return;

                var ths = container.querySelectorAll('th.sticky-col');

                // console.log('Recalculating Sticky Offsets. Found sticky headers:', ths.length);

                var currentLeft = 0;
                var frozenCount = 0;
                var anyChanges = false;

                $scope.availableColumns.forEach(function (col) {
                    if (col.frozen) {
                        if (ths[frozenCount]) {
                            var width = ths[frozenCount].offsetWidth;
                            var oldLeft = col.stickyLeft;

                            col.stickyLeft = currentLeft;
                            // console.log('Col:', col.label, 'Width:', width, 'New Left:', currentLeft);

                            if (oldLeft !== currentLeft) anyChanges = true;

                            currentLeft += width;
                            frozenCount++;
                        }
                    }
                });

                // If the DOM wasn't ready (width 0), try again
                if (frozenCount > 0 && currentLeft === 0) {
                    $timeout($scope.recalculateStickyOffsets, 50);
                }
            };

            // Drag Handlers
            $scope.onDropGroup = function (item) {
                if (!$scope.groupedColumns.some(c => c.field === item.field)) {
                    $scope.groupedColumns.push(angular.copy(item));
                    $scope.processData();
                }
                return true;
            };

            $scope.onDropSort = function (item) {
                if (!$scope.sortedColumns.some(c => c.field === item.field)) {
                    var newItem = angular.copy(item);
                    newItem.reverse = false; // Default Asc
                    $scope.sortedColumns.push(newItem);
                    $scope.processData();
                }
                return true;
            };

            $scope.onDropFilter = function (item) {
                if (!$scope.filteredColumns.some(c => c.field === item.field)) {
                    var newItem = angular.copy(item);
                    newItem.filterValue = '';
                    $scope.filteredColumns.push(newItem);
                    $scope.processData(); // Likely no change yet as filter is empty
                }
                return true;
            };

            $scope.onDropFrozen = function (item) {
                if (!$scope.frozenColumns.some(c => c.field === item.field)) {
                    $scope.frozenColumns.push(angular.copy(item));
                    $scope.updateAvailableColumns(); // Re-sort columns
                    // We don't strictly need to processData if we only change column order, 
                    // but if it affects rendering we might.
                }
                return true;
            };

            $scope.removeGroup = function (index) {
                $scope.groupedColumns.splice(index, 1);
                $scope.processData();
            };

            $scope.removeSort = function (index) {
                $scope.sortedColumns.splice(index, 1);
                $scope.processData();
            };

            $scope.removeFilter = function (index) {
                $scope.filteredColumns.splice(index, 1);
                $scope.processData();
            };

            $scope.removeFrozen = function (index) {
                $scope.frozenColumns.splice(index, 1);
                $scope.updateAvailableColumns();
            };

            $scope.toggleSortOrder = function (col) {
                col.reverse = !col.reverse;
                $scope.processData();
            }

            $scope.updateGrouping = function () {
                $scope.processData();
            };

            $scope.toggleGroup = function (groupRow) {
                groupRow.expanded = !groupRow.expanded;
                $scope.processData();
            };

            // Pagination State
            $scope.currentPage = 1;
            $scope.pageSize = 10;
            $scope.totalPages = 1;
            $scope.pagedData = [];

            // Core Data Processing
            $scope.processData = function () {
                var data = angular.copy($scope.rawData);

                // 0. Global Filter
                if ($scope.searchQuery) {
                    data = $filter('filter')(data, $scope.searchQuery);
                }

                // 0.5 Column Specific Filters
                if ($scope.filteredColumns.length > 0) {
                    data = data.filter(function (item) {
                        return $scope.filteredColumns.every(function (col) {
                            if (!col.filterValue) return true;
                            var val = item[col.field];
                            if (val === null || val === undefined) return false;
                            return val.toString().toLowerCase().includes(col.filterValue.toLowerCase());
                        });
                    });
                }

                // 1. Sort
                // Priority: Dragged Sort Columns > Group Columns (implicit) > Clicked Header (legacy/fallback)
                var sortPredicates = [];

                // Grouping implicitly sorts
                $scope.groupedColumns.forEach(function (col) {
                    sortPredicates.push(col.field);
                });

                // Explicit Sorts
                $scope.sortedColumns.forEach(function (col) {
                    sortPredicates.push((col.reverse ? '-' : '+') + col.field);
                });

                // Fallback to table header sort if no explicit sort
                // (Optional: You might want to remove table header sorting if using DnD sort exclusively, 
                // but keeping it as a fallback or secondary is fine. Let's append it last)
                if ($scope.sortField) {
                    sortPredicates.push(($scope.sortReverse ? '-' : '+') + $scope.sortField);
                }

                if (sortPredicates.length > 0) {
                    data = $filter('orderBy')(data, sortPredicates);
                }


                // Calculate Grand Totals
                $scope.grandTotals = {};
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
                    $scope.groupedData = data.map(function (item) {
                        item.visible = true;
                        item.isGroup = false;
                        return item;
                    });
                }

                // 3. Paginate
                $scope.updatePagination();

                // Recalculate sticky offsets in case widths changed
                $timeout(function () {
                    $scope.recalculateStickyOffsets();
                }, 50);
            };

            $scope.updatePagination = function () {
                $scope.totalPages = Math.ceil($scope.groupedData.length / $scope.pageSize);
                if ($scope.currentPage > $scope.totalPages) $scope.currentPage = $scope.totalPages || 1;
                if ($scope.currentPage < 1) $scope.currentPage = 1;

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
                            expanded: true,
                            items: [],
                            count: 0,
                            sums: {}
                        };
                        $scope.availableColumns.forEach(function (col) {
                            if (col.hasTotal) groups[value].sums[col.field] = 0;
                        });
                    }
                    groups[value].items.push(item);
                    groups[value].count++;

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
                    for (var field in group.sums) {
                        group.sums[field] = Math.round(group.sums[field] * 100) / 100;
                    }
                    result.push(group);
                }
                result.sort(function (a, b) { return a.groupValue < b.groupValue ? -1 : 1; });
                return result;
            }

            // Helper to flatten groups for display
            function flattenGroups(groups) {
                var flat = [];
                groups.forEach(function (group) {
                    var existing = findExistingGroup(group);
                    if (existing) group.expanded = existing.expanded;

                    flat.push(group);
                    if (group.expanded) {
                        if (group.items[0] && group.items[0].isGroup) {
                            flat = flat.concat(flattenGroups(group.items));
                        } else {
                            group.items.forEach(function (item) {
                                item.visible = true;
                                item.isGroup = false;
                                flat.push(item);
                            });
                        }
                        flat.push({ isSummary: true, level: group.level, sums: group.sums });
                    }
                });
                return flat;
            }

            function findExistingGroup(newGroup) {
                if (!$scope.groupedData) return null;
                for (var i = 0; i < $scope.groupedData.length; i++) {
                    var row = $scope.groupedData[i];
                    if (row.isGroup && row.groupField === newGroup.groupField && row.groupValue === newGroup.groupValue && row.level === newGroup.level) {
                        return row;
                    }
                }
                return null;
            }

            $scope.onHeaderDrag = function (col) { return col; };

            $scope.exportToExcel = function () {
                var data = angular.copy($scope.rawData);
                if ($scope.searchQuery) data = $filter('filter')(data, $scope.searchQuery);
                data = $filter('orderBy')(data, $scope.sortField, $scope.sortReverse);

                var sheetData = [];
                var headers = $scope.availableColumns.map(function (c) { return c.label; });
                sheetData.push(headers);

                if ($scope.groupedColumns.length > 0) {
                    var groups = groupDataRecursive(data, 0);
                    var traverse = function (nodes, indent) {
                        nodes.forEach(function (node) {
                            if (node.isGroup) {
                                var indentStr = "    ".repeat(indent);
                                var row = [indentStr + node.groupField + ": " + node.groupValue + " (" + node.count + ")"];
                                sheetData.push(row);
                                traverse(node.items, indent + 1);
                                var summaryRow = $scope.availableColumns.map(function (col, index) {
                                    if (index === 0) return "Total";
                                    if (col.hasTotal) return node.sums[col.field];
                                    return "";
                                });
                                sheetData.push(summaryRow);
                            } else {
                                var row = $scope.availableColumns.map(function (col) { return node[col.field]; });
                                sheetData.push(row);
                            }
                        });
                    };
                    traverse(groups, 0);
                } else {
                    data.forEach(function (item) {
                        var row = $scope.availableColumns.map(function (col) { return item[col.field]; });
                        sheetData.push(row);
                    });
                }

                var exportTotals = {};
                $scope.availableColumns.forEach(function (col) { if (col.hasTotal) exportTotals[col.field] = 0; });
                data.forEach(function (item) {
                    $scope.availableColumns.forEach(function (col) {
                        if (col.hasTotal && item[col.field] && !isNaN(item[col.field])) exportTotals[col.field] += parseFloat(item[col.field]);
                    });
                });

                var grandTotalRow = $scope.availableColumns.map(function (col, index) {
                    if (index === 0) return "Grand Total";
                    if (col.hasTotal) return exportTotals[col.field];
                    return "";
                });
                sheetData.push([]);
                sheetData.push(grandTotalRow);

                var ws = XLSX.utils.aoa_to_sheet(sheetData);
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Report");
                XLSX.writeFile(wb, "Report_Export_" + new Date().toISOString().slice(0, 10) + ".xlsx");
            };
        }]
    };
});

app.controller('ReportController', ['$scope', '$timeout', function ($scope, $timeout) {

    // Mock Data Sets (Simulating API Response Database)
    var db = {
        'sales': [
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
        ],
        'inventory': [
            { "product": "Laptop", "region": "North", "stock": 50, "warehouse": "Main" },
            { "product": "Mouse", "region": "North", "stock": 200, "warehouse": "Main" },
            { "product": "Keyboard", "region": "South", "stock": 150, "warehouse": "Secondary" },
            { "product": "Chair", "region": "North", "stock": 30, "warehouse": "Main" },
            { "product": "Desk", "region": "South", "stock": 15, "warehouse": "Secondary" },
            { "product": "Headphones", "region": "East", "stock": 100, "warehouse": "Main" },
            { "product": "Monitor", "region": "West", "stock": 60, "warehouse": "Secondary" }
        ]
    };

    // Dataset List
    $scope.datasets = [
        { id: 'sales', name: 'Sales Data' },
        { id: 'inventory', name: 'Inventory Data' }
    ];

    $scope.selectedDatasetId = null;
    $scope.currentReportData = null;
    $scope.isLoading = false;

    // Simulate API Call
    $scope.loadDataset = function (id) {
        $scope.selectedDatasetId = id;
        $scope.isLoading = true;
        $scope.currentReportData = null; // Clear current data while loading

        // Simulate network delay of 500ms
        $timeout(function () {
            if (db[id]) {
                $scope.currentReportData = db[id];
            } else {
                $scope.currentReportData = []; // Or handle error
            }
            $scope.isLoading = false;
        }, 500);
    };

    // Auto-load first dataset (optional)
    // $scope.loadDataset($scope.datasets[0].id);

}]);
