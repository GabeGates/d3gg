
const d3gg = {
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    },

    numberFormatter: function (value) {
        return (value || '0').replace(new RegExp(this.escapeRegExp(','), 'g'), '');
    },

    psv: function (fileName, callback) {
        let psv = d3.dsvFormat("|");

        d3.request(fileName)
            .mimeType("text/plain")
            .response(function (data) { return psv.parse(data.response) })
            .get(callback);
    },

    promiseBuilder: function (callback) {
        return new Promise(function (resolve, reject) {
            try {
                callback(resolve, reject);
            } catch (e) {
                console.error("Bad Promise Fetch");
                reject(e);
            }
        });
    },

    promiseCbsaData: function () {
        let callback = (resolve) => d3.csv("data/cbsalist.csv", data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseStateData: function () {
        let callback = (resolve) => d3.csv("data/stfips.csv", data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseZipData: function () {
        let callback = (resolve) => d3.csv("data/z5max.csv", data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseTerrRosterData: function () {
        let callback = (resolve) => this.psv("data/terrRoster.txt", data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseTerrToZipData: function () {
        let callback = (resolve) => this.psv("data/terrToZip.txt", data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseCSV: function (fileName) {
        let callback = (resolve) => d3.csv(fileName, data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promiseJSON: function (fileName) {
        let callback = (resolve) => d3.json(fileName, data => resolve(data));

        return this.promiseBuilder(callback);
    },

    promisePSV: function (fileName) {
        let callback = (resolve) => this.psv(fileName, data => resolve(data));

        return this.promiseBuilder(callback);
    }
}


d3gg.chart = {
    bar: function (config) {
        if (!config) {
            throw ('d3gg.chart requires config for example:', {
                selector: '#containerId svg',
                data: [15, 20, 22, 8, 100, 10],

            });
        }
        config = config || {};


        let selector = config.selector;
        let data = config.data;
        let bindingKey = config.bindingKey || JSON.stringify;

        let heightValue = config.height || (d => d);
        let maxHeight = d3.max(data, heightValue);
        let maxRange = config.maxRange || 100;
        let scale = config.scale || d3.scaleLinear().domain([0, maxHeight]).range([0, maxRange]);


        if (config.scalePolylinear) {
            // Example of Polylinear with multiple point to normalize outliers
            let meanHeight = d3.mean(data, heightValue);
            scale = d3.scaleLinear().domain([0, meanHeight, maxHeight]).range([0, 75, 100]);
        }

        let height = d => scale(heightValue(d));
        let width = config.width || 10;
        let xSpaceBetween = config.xSpaceBetween || 10;

        let yValue = config.y || (d => heightValue(d));
        let xValue = config.x || ((d, i) => i * width);

        let x = (d, i) => xValue(d, i) + (i * xSpaceBetween);
        let y = d => maxRange - scale(yValue(d));


        let groupAppender = d3.select(selector)
            .selectAll("g")
            .data(data, bindingKey)
            .enter()
            .append("g")
            .attr("transform", (d, i) =>
                "translate(" + x(d, i) + "," + y(d, i) + ")"
            );

        let element = config.element || "rect";
        let elementAppender = groupAppender
            // .selectAll(element)
            // .data(data)
            // .enter()
            .append(element);

        elementAppender = elementAppender
            .attr("width", width)
            .attr("height", height);
        // .attr("x", x)
        // .attr("y", y);

        // TODO: Figure out why anonymous function is not working with .style()
        let fill = config.fill || "orange" // || (d => { d.color || "orange" });
        let stroke = config.stroke || "gray" // || (d => { d.stroke || "gray" });
        let strokeWidth = config.strokeWidth || "1px" // || (d => { d.strokeWidth || "1px" });
        elementAppender
            .style("fill", fill)
            .style("stroke", stroke)
            .style("stroke-width", strokeWidth);

        let opacity = config.opacity;
        if (opacity) {
            elementAppender.style("opacity", opacity);
        }

        if (config.label) {
            groupAppender
                .append("text")
                .text(config.label);
        }
    },


    barStacked: function (config) {
        if (!config) {
            throw ('d3gg.chart requires config for example:', {
                selector: '#containerId svg',
                data: [
                    [15, 20, 22, 8, 100, 10],
                    [25, 10, 32, 68, 12, 40],
                    [45, 30, 2, 23, 57, 20]
                ],
            });
        }
        config = config || {};
        let data = config.data || [];
        let configCopy = Object.assign({}, config);
        configCopy.data = [];

        for (let i = 0; i < data.length; i++) {
            let barData = data[i];
            let categoryLabel = i;
            for (let j = 0; j < barData.length; j++) {
                configCopy.data.push({
                    category: i,
                    value: barData[j],
                    label: categoryLabel
                });
                categoryLabel = undefined;
            }

        }

        configCopy.x = d => d.category * (10 + 10);
        configCopy.xSpaceBetween = "0";
        configCopy.y = d => d.value;
        configCopy.height = d => d.value;
        configCopy.label = d => d.label;
        configCopy.opacity = .25;
        this.bar(configCopy);
    },


    scatterPlot: function (config) {
        if (!config) {
            throw ('d3gg.chart requires config for example:', {
                selector: '#containerId svg',
                data: [
                    [15, 20, 22, 8, 100, 10],
                    [25, 10, 32, 68, 12, 40],
                    [45, 30, 2, 23, 57, 20]
                ],
            });
        }
        config = config || {};
        let data = config.data || [];
        let selector = config.selector;
        let bindingKey = config.bindingKey || JSON.stringify;

        let maxImpact = d3.max(data, d => d.impact);
        let startEnd = d3.extent(data, d => d.time);
        let timeRamp = d3.scaleTime().domain(startEnd).range([20, 480]);
        let yScale = d3.scaleLinear().domain([0, maxImpact]).range([1, 460]);
        let radiusScale = d3.scaleLinear().domain([0, maxImpact]).range([1, 20]);
        let colorScale = d3.scaleLinear().domain([0, maxImpact]).range(["white", "#75739F"]);

        let element = config.element || "circle";
        let selectAll = d3.select(selector)
            .selectAll("g");

        let groupAppender = selectAll
            .data(data, bindingKey)
            .enter()
            .append("g")
            .attr("transform", d =>
                "translate(" + timeRamp(d.time) + "," + (480 - yScale(d.impact)) + ")"
            );


        let stroke = config.stroke || "black" // || (d => { d.stroke || "gray" });
        let strokeWidth = config.strokeWidth || "1px" // || (d => { d.strokeWidth || "1px" });
        let elementAppender = groupAppender
            .append(element)
            .attr("r", d => radiusScale(d.impact))
            // .attr("cx", d => timeRamp(d.time))
            // .attr("cy", d => 480 - yScale(d.impact))
            .style("fill", d => colorScale(d.impact))
            .style("stroke", stroke)
            .style("stroke-width", strokeWidth);

        if (config.label) {
            groupAppender
                .append("text")
                .text(config.label);
        }

        return {
            selectAll: selectAll,
            groupAppender: groupAppender,
            elementAppender: elementAppender
        }
    }
}