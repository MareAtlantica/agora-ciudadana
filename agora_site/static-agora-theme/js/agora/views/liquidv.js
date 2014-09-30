var Liquidv = (function () {

    var Constructor;

    // properties
    var url;
    var width = 570, height = 350;
    // var initialVector = [50,50];
    // var initialScale = 0.80;
    var editable = true;

    // main d3 data	
    var lastNodeId = 0;
    var lastLinkId = 0;
    var nodes = null;
    var links = null;
    var force = null;

    // mouse event vars
    var selected_node = null,
        selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

    // private functions

    // d3 functions
    var redraw = function() {        
        svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var resetMouseVars = function () {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
    }

    // update force layout (called automatically each iteration)
    var tick = function() {
        // draw directed edges with proper padding from node centers
        path.selectAll('path').attr('d', function(d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding,
                targetPadding;

                // adjust padding dependig on type and vote count
                if(maxVotes > 0.0) {
                    sourcePadding = 12 + (d.source.votes/maxVotes) * 5;
                    targetPadding = 17 + (d.target.votes/maxVotes) * 5;
                }
                else {
                    sourcePadding = (d.source.type == 'voter') ? 12 : 16;
                    targetPadding = (d.target.type == 'voter') ? 17 : 21;
                }

                var sourceX = d.source.x + (sourcePadding * normX),
                    sourceY = d.source.y + (sourcePadding * normY),
                    targetX = d.target.x - (targetPadding * normX),
                    targetY = d.target.y - (targetPadding * normY);

            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });			

        circle.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    }

    // update graph (called when needed)
    var restart = function() {
        // path (link) group, links are known by id
        path = path.data(links, function(d) { return d.id });

        // update existing links
        path.selectAll('path').classed('selected', function(d) { return d === selected_link; })                        
        .style('marker-end', function(d) {            
            return 'url(#end-arrow-' + grayScale(maxWeight - (d.source.votes / d.choices), maxWeight) + ')';
        })
        .style('stroke', function(d) {
           return '#' + grayScale(maxWeight - (d.source.votes / d.choices), maxWeight);
        });
        
        // add new links
        var ps = path.enter().append('svg:g')
        ps.append('svg:path')
        .attr('id', function(d) { return 'path' + d.id; })
        .attr('class', 'link')
        .classed('selected', function(d) { return d === selected_link; })
        .style('marker-start', '')        
        .style('marker-end', function(d) { 
            return 'url(#end-arrow-' + grayScale(maxWeight - (d.source.votes / d.choices), maxWeight) + ')';
         })
        .style('stroke', function(d) { 
            return '#' + grayScale(maxWeight - (d.source.votes / d.choices), maxWeight);
         })
        .on('mousedown', function(d) {				
            // select link
            mousedown_link = d;
            if(mousedown_link === selected_link) selected_link = null;
            else selected_link = mousedown_link;
            selected_node = null;

            restart();
        });
        
        // path label text
        /* ps.append('svg:text')
            .attr('x', 50)
            .attr('dy', 15)
            // .style('font-family', 'Verdana')
            .style('font-size', '5')
            .append('svg:textPath')	
            .attr('xlink:href', function(d) { return '#path' + d.id })
            .text(function(d) { 
                if(d.label != null) return d.label; 
            });*/

        // remove old links
        path.exit().remove();

        // circle (node) group, nodes are known by id
        circle = circle.data(nodes, function(d) { return d.id; });

        // update existing nodes (selected visual states)
        circle.selectAll('circle')            
        .style('fill', function(d) { 
            return (maxVotes > 0.0 && d.votes == maxVotes && d.type == 'choice') ? 'red' : (d === selected_node) ? d3.rgb(d.color).brighter().toString() : d3.rgb(d.color); 
        })
        .attr('r', function(d) {                                 
            if(maxVotes > 0.0) {
                return 12 + (d.votes/maxVotes) * 6;
            }
            else {
                return (d.type == 'voter') ? 12 : 16;
            }
        });

        // update votes (for tally)
        circle.selectAll('text.votes').text(function(d) { return d.votes; });              

        // add new nodes
        var g = circle.enter().append('svg:g');

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', function(d) {                 
                if(maxVotes > 0.0) {
                    return 12 + (d.votes/maxVotes) * 6;
                }
                else {
                    return (d.type == 'voter') ? 12 : 16;
                }
            })            
            .style('fill', function(d) { return (d === selected_node) ? d3.rgb(d.color).brighter().toString() : d3.rgb(d.color); })
            .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })            
            .on('mouseover', function(d) {
                if(!mousedown_node || d === mousedown_node) return;
                // enlarge target node
                d3.select(this).attr('transform', 'scale(1.1)');
            })
            .on('mouseout', function(d) {
                if(!mousedown_node || d === mousedown_node) return;
                // unenlarge target node
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', function(d) {

                // select node
                mousedown_node = d;
                if(mousedown_node === selected_node) selected_node = null;
                else selected_node = mousedown_node;
                selected_link = null;

                var info = 'Selected node \'' + ((d.name) ? d.name : d.user_name) + '\' (type ' + d.type + '), ' + d.votes + ' votes';
                if(d.votes == maxVotes) info += ' (max)';
                $('.graph-info').text(info);

                console.log(selected_node);

                // code for dragging
                if(d3.event.ctrlKey) {

                    // disable zoom and save translate vector
                    full.call(zoom.on("zoom", null));
                    translatex = zoom.translate()[0];
                    translatey = zoom.translate()[1];

                    // reposition drag line
                    drag_line.style('marker-end', 'url(#end-arrow-000)')
                    .classed('hidden', false)
                    .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);			 
                }

                restart();
            })
            .on('mouseup', function(d) {
                if(!mousedown_node) return;

                // use this if not allowing distributed voting
                /* link = links.filter(function(l) {
                    return (l.source === mousedown_node);
                })[0];
                if(link) return;*/

                // cycle detection would go here

                // needed by FF
                drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');

                // check for drag-to-self
                mouseup_node = d;
                if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)                
                var source, target, direction;
                
                source = mousedown_node;
                target = mouseup_node;

                var link;
                link = links.filter(function(l) {
                    return (l.source === source && l.target === target);
                })[0];

                if(link) {
                    link[direction] = true;
                } else {
                    link = {source: source, target: target, 'id': ++lastLinkId};
                    link[direction] = true;
                    links.push(link);
                }

                // select new link
                selected_link = link;
                selected_node = null;

                // reset zoom
                var scale = zoom.scale();
                zoom = d3.behavior.zoom();
                zoom.scale(scale);
                zoom.translate([translatex, translatey]);
                full.call(zoom.on("zoom", redraw));

                // update targets
                mousedown_node.targets = [mouseup_node].concat(mousedown_node.targets);
                console.log('update targets');
                console.log(mousedown_node.targets);

                restart();	
            });

        // show node IDs
        g.append('svg:text')
                .attr('x', 0)
                .attr('y', 4)
                .attr('class', 'votes')
                .text(function(d) { return d.votes; });
        g.append('svg:text')
                .attr('x', 20)
                .attr('y', 4)
                .text(function(d) { return d.name; });

        // remove old nodes
        circle.exit().remove();

        // set the graph in motion
        force.start();
    }

    var mousedown = function () {
        // prevent I-bar on drag
        //d3.event.preventDefault();
        // because :active only works in WebKit?
        svg.classed('active', true);

        if((!d3.event.altKey) || mousedown_node || mousedown_link) return;

        // insert new node at point
        var point = d3.mouse(this),
                node = {id: ++lastNodeId, reflexive: false, 'type': 'voter', 'votes': 1, 'color':'orange', 'targets':[]};

        node.x = point[0];
        node.y = point[1];
        nodes.push(node);

        restart();
    }

    var mousemove = function () {
        if(!mousedown_node) return;

        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

        restart();
    }

    var mouseup = function () {
        if(mousedown_node) {
            // hide drag line
            drag_line.classed('hidden', true).style('marker-end', '');

            // reset zoom
            var scale = zoom.scale();
            zoom = d3.behavior.zoom();
            zoom.scale(scale);			
            zoom.translate([translatex, translatey]);
            full.call(zoom.on("zoom", redraw));
        }

        // because :active only works in WebKit?
        svg.classed('active', false);

        // clear mouse event vars
        resetMouseVars();
    }

    var spliceLinksForNode = function(node) {
        var toSplice = links.filter(function(l) {
            return (l.source === node || l.target === node);
        });
        toSplice.map(function(l) {
            l.source.targets.splice(l.source.targets.indexOf(l.target), 1);
            links.splice(links.indexOf(l), 1);
        });
    }

    // only respond once per keydown
    var lastKeyDown = -1;

    var keydown = function() {
        d3.event.preventDefault();

        if(lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        // ctrl
        if(d3.event.keyCode === 17) {
            circle.on('mousedown.drag', null).on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }	

        if(!selected_node && !selected_link) return;
        switch(d3.event.keyCode) {
            case 8: // backspace
            case 46: // delete
                if(selected_node) {
                    nodes.splice(nodes.indexOf(selected_node), 1);
                    spliceLinksForNode(selected_node);
                } else if(selected_link) {
console.log(selected_link);
                    selected_link.source.targets.splice(selected_link.source.targets.indexOf(selected_link.target), 1);
                    links.splice(links.indexOf(selected_link), 1);
                }
                selected_link = null;
                selected_node = null;

                restart();
                break;
        }
    }

    var keyup = function () {
        lastKeyDown = -1;

        // ctrl
        if(d3.event.keyCode === 17) {
            circle.call(force.drag);
            svg.classed('ctrl', true);
        }
    }

    //// svg dom initialization	

    var  colors = d3.scale.category10();
    var zoom = d3.behavior.zoom();
    var translatex = 0;
    var translatey = 0;

    $('#graph').addClass('graph');

    var full = d3.select('#graph')
    .append('svg')    
    .attr("viewBox", "0 0 " + width + " " + height )
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("pointer-events", "all")
    .call(zoom.on("zoom", redraw));
    
    var svg = full.append('svg:g');   

    // background rect to capture editing events
    var rect = svg.append('svg:g').append('svg:rect')
        .attr('width', width)
        .attr('height', height)		
        .attr('fill', 'white');

    // define arrow markers for graph links        
    var defs = svg.append('svg:defs').attr('id', 'svg-defs');
    
    defs.append('svg:marker')
    .attr('id', 'end-arrow-000')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');       
    
    for(var i = 1; i < 15; i++) {        
        var hex = new Array(4).join(i.toString(16));
        
        var head = $('#end-arrow-000').clone().attr('id', 'end-arrow-' + hex).appendTo($('#svg-defs'));
        head.children('path').attr('fill', '#' + hex);
    }

    // line displayed when dragging new nodes
    var drag_line = svg.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    var path = svg.append('svg:g').selectAll('path');
    var circle = svg.append('svg:g').selectAll('g');	

    // api urls
    var delegatedVotesUrl = function(id) {
        return url + 'api/v1/election/' + id + '/delegated_votes/?format=json&limit=1000';
    }
    var directVotesUrl = function(id) {
        return url + 'api/v1/election/' + id + '/direct_votes/?format=json&limit=1000';
    }

    // FIXME loop detection
    // liquid tally
    var maxVotes = 0.0;
    var maxWeight = 0;
    var liquidTally = function(nodes) {
        var next = [];
        $.each(nodes, function(index, item) {
            if(item.targets != null && (item.transients > 0)) {
                $.each(item.targets, function(index, target) {
                    target.votes = target.votes + item.transients;
                    maxVotes = (target.votes > maxVotes) ? target.votes : maxVotes;
                    if(target.type == 'voter') {
                        maxWeight = (target.votes > maxWeight) ? target.votes : maxWeight;
                    }
                    target.transients = target.transients + item.transients;
                });
                item.transients = 0;
                next = next.concat(item.targets);
            }
        });
        if(next.length > 0) liquidTally(next);
    }
    
    var grayScale = function(level, max) {
        var ret = '000';
        if(max != 0) {
            var number = Math.floor((level / max) * 14);
            ret = new Array(4).join(number.toString(16));
        }
        
        return ret;
    }

    // constructor
    Constructor = function (properties) {
        var vector = [50,50];
        var scale = 0.80;	

        url = properties.url;
        // javascript really screwed it with falsiness
        if(properties.width) width = properties.width;
        if(properties.height) height = properties.height;
        if(properties.vector) vector = properties.vector;
        if(properties.scale) scale = properties.scale;

        full.attr('width', width);
        full.attr('height', height);
        zoom.translate(vector);
        zoom.scale(scale);
        svg.attr("transform", "translate(" + vector + ")" + " scale(" + scale + ")");
        rect.attr("transform", "translate(" + [-3000,-3000] + ")" + " scale(" + 50.0 + ")");

        var me = this;
        $("#tally-button").click(function () {
            me.tally();
        });
    };

    // public api
    Constructor.prototype = {
        constructor: Liquidv,

        // request data and draw
        draw: function(electionId) {
            var me = this;
            lastNodeId = 0;
            lastLinkId = 0;
            $(".graph-info").text('Loading graph data..');
            $.getJSON(delegatedVotesUrl(electionId), {})
            .done(function( delegated ) {
                var allNodes = {};
                var loadedVotes = 0, loadedDelegatedVotes = 0;
                $.each(delegated.objects, function(index, item) {
                    var voter = item.voter;
                    if(allNodes[voter.id] == null) {
                        allNodes[voter.id] = {'id': ++lastNodeId, 'name': voter.first_name, 'user_name': voter.username, 'type': 'voter', 'color': '#0099FF', 'targets': [], 'votes': 1};
                    }
                    
                    if(item.public_data.answers != null) {
                        var choice = item.public_data.answers[0].choices[0];
                        
                        var delegateNode, voterNode;
                        if(allNodes[choice.user_id] == null) {
                            allNodes[choice.user_id] = {'id': ++lastNodeId, 'name': choice.user_name, 'user_name': choice.username, 'type': 'voter', 'color': '#0099FF', 'targets': [], 'votes': 1};
                        }
                        delegateNode = allNodes[choice.user_id];
                        
                        voterNode = allNodes[voter.id];
                        // update targets
                        voterNode.targets = [delegateNode].concat(voterNode.targets);
                        loadedDelegatedVotes++;
                    }
                });
                
                $.getJSON(directVotesUrl(electionId), {})
                .done(function( direct ) {
                    
                    $.each(direct.objects, function(index, item) {                        
                        var voterNode;
                        var voter = item.voter;
                        if(allNodes[voter.id] == null) {
                            allNodes[voter.id] = {'id': ++lastNodeId, 'name': voter.first_name, 'user_name': voter.username, 'type': 'voter', 'color': '#0099FF', 'targets': [], 'votes': 1};
                        }
                        voterNode = allNodes[voter.id];
                        
                        if(item.public_data.answers != null) {
                            /* var choice = item.public_data.answers[0].choices[0];
                            var voter = item.voter;
                            var choiceNode, voterNode;
                            if(allNodes[choice] == null) {
                                allNodes[choice] = {'id': ++lastNodeId, 'name': choice, 'user_name': '', 'type': 'choice', 'color': '#00CC00', 'votes': 0}
                            }
                            choiceNode = allNodes[choice];					
                            if(allNodes[voter.id] == null) {
                                allNodes[voter.id] = {'id': ++lastNodeId, 'name': voter.first_name, 'user_name': voter.username, 'type': 'voter', 'color': '#0099FF', 'targets': [], 'votes': 1};
                            }
                            voterNode = allNodes[voter.id];
                            // update targets
                            voterNode.targets = [choiceNode].concat(voterNode.targets);
                            loadedVotes++;*/
                            
                            
                            var choices = item.public_data.answers[0].choices;
                            $.each(choices, function(idx, choice) {
                                var choiceNode;
                            
                                if(allNodes[choice] == null) {
                                    allNodes[choice] = {'id': ++lastNodeId, 'name': choice, 'user_name': '', 'type': 'choice', 'color': '#00CC00', 'votes': 0}
                                }
                                choiceNode = allNodes[choice];					
                                
                                // update targets
                                voterNode.targets = [choiceNode].concat(voterNode.targets);                                
                            });
                            loadedVotes++;
                        }
                        $(".graph-info").text('Loaded ' + loadedVotes + ' direct votes and ' + loadedDelegatedVotes +  ' delegated votes');				
                    });                  

                    // reset, must be done here
                    if(force != null) {
                        force.stop();
                        links = [];
                        nodes = [];
                        restart();
                    }

                    // once we have accumulated all the nodes (users plus choices), construct links
                    var delegationLinks = $.map(delegated.objects, function(x, index) {
                        if(x.public_data.answers != null) {
                            var choice = x.public_data.answers[0].choices[0];
                            var voter = x.voter;
                            // console.log(voter.id + " -> " + choice.user_id);
                            return {'source': allNodes[voter.id], 'target': allNodes[choice.user_id], 'id': ++lastLinkId, 'color': '#0099FF', 'choices': 1};
                        }
                    });
                    var voteLinks = $.map(direct.objects, function(x, index) {                    
                        if(x.public_data.answers != null) {
                            /* var choice = x.public_data.answers[0].choices[0];
                            var voter = x.voter;
                            return {'source': allNodes[voter.id], 'target': allNodes[choice], 'id': ++lastLinkId, 'color': '#0099FF'};*/
                            var ret = $.map(x.public_data.answers[0].choices, function(y, index) {                    
                                return {'source': allNodes[x.voter.id], 'target': allNodes[y], 'id': ++lastLinkId, 'color': '#0099FF', 'choices': x.public_data.answers[0].choices.length, 'label': index + 1};
                            });
                            return ret;
                        }                    
                    });

                    links = delegationLinks.concat(voteLinks)
                    // get only the values
                    nodes = Object.keys(allNodes).map(function(key){
                        return allNodes[key];
                    });

console.log('links');
console.log(links);
console.log('nodes');
console.log(nodes);
                                                            
                    me.go()
                    me.tally();
                });
            });
        },
        // FIXME should be private
        go: function() {
            force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            .size([width, height])
            .linkDistance(150)
            .charge(-500)
            // .gravity(0.15)
            .on('tick', tick)	

            svg.on('mousedown', mousedown)
                .on('mousemove', mousemove)
                .on('mouseup', mouseup);
            d3.select(window)
                .on('keydown', keydown)
                .on('keyup', keyup);

            restart();				
            // drag circles by default
            circle.call(force.drag);
        },
        tally: function() {
            $(".graph-info").text('Running tally..');

            $.each(nodes, function(index, item) {

                if(item.type == 'voter') {
                    item.transients = 1;
                    item.votes = 1;
                }
                else {
                    item.transients = 0;
                    item.votes = 0;
                }					
            });
            maxVotes = 0.0;
            maxWeight = 0;
            liquidTally(nodes);

            $(".graph-info").text('Tally complete');
            restart();
        },
        resize: function(width, height) {
            full.attr('width', width)
            .attr('height', height);
            restart();
        }
    };

    // return the constructor	
    return Constructor;

}());