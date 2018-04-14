var request = require('request');
var lodash = require('lodash');

exports.index = function(req, res, scope){
    if (req.signedCookies.access_token) {
        var base_uri = 'https://api.23andme.com/3';
        var headers = {Authorization: 'Bearer ' + req.signedCookies.access_token};
        request.get({ url: base_uri + '/account', headers: headers, json: true }, function (e, r, body) {
            if(r.statusCode != 200) {
                res.clearCookie('access_token');
                res.redirect('/');
            } else {
                var profileId = body.data[0].profiles[0].id;
                request.get({ url: base_uri + `/profile/${profileId}/marker/?id=rs1800497,rs6280,rs1799971`, headers: headers, json: true}, function (e, r, body) {
                    const genotypes = lodash.map(body.data, genotype => {
                        let description;
                        if (genotype.is_genotyped) {
                            description = `Gene ${genotype.id} ${genotype.gene_names[0]} was found`;
                        } else {
                            description = `Gene ${genotype.id} ${genotype.gene_names[0]} was not found`;
                        }

                        return {
                            id: genotype.id,
                            geneName: genotype.gene_names[0],
                            isGenotyped: genotype.is_genotyped,
                            description: description
                        }
                    });

                    const details = ["DRD2 rs1800497 allele is higher in subjects with opioid addiction than controls, and it is predictive of successful methadone treatment outcomes.",
                        "DRD3 BalI allele is associated with higher sensation seeking, a risk factor for developing opioid addiction",
                        "The rs1799971 G allele may confer protective effects in Hispanics, whereas it is associated with opioid-dependence in an Indian population."];
                        
                    res.render('result', {

                        // names: names_by_id,
                        // profile_id: profileId,
                        // headers: headers,
                        genotypes: genotypes,
                        details: details
                    });
                });
            }
            // res.set('Content-Type', 'application/json');
            // res.send({
            //     body: body
            // })
        });
    } else {
        res.render('index', {
            client_id: process.env.CLIENT_ID,
            scope: scope,
            redirect_uri: process.env.REDIRECT_URI
        });
    }
};

exports.receive_code = function(req, res, scope){
    if (!req.query.code) {
        res.render('error', {
            client_id: process.env.CLIENT_ID,
            scope: scope,
            redirect_uri: process.env.REDIRECT_URI
        });
    } else {
        // Exchange the code for a token,
        // store it in the session, and redirect.
        request.post({
            url: 'https://api.23andme.com/token/',
            form: {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: req.query.code,
                redirect_uri: process.env.REDIRECT_URI,
                scope: scope
            },
            json: true }, function(e, r, body) {
                if (!e && r.statusCode == 200) {
                    res.cookie('access_token', body.access_token, {signed: true});
                    res.redirect('/');
                } else {
                    res.send(body);
                }
            });
    }
};
