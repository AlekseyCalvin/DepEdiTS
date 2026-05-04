import { DepEditEngine } from './engine.js';

export const STAN2UNI_INI = String.raw`;;;Configuration file to convert Stanford Typed Dependencies to Universal Dependencies
;;;Note not all aspects of universal dependencies are covered, especially handling of the 'flat' label requires NER information assumed below
;handle free relatives such as "an expectation of what to do" (change pcomp to pobj+rcmod)
func=/prep/;pos=/^W.*/;func=/pcomp/	#1>#3;#3>#2	#2:func=pobj;#1>#2;#2>#3;#3:func=rcmod

;simple rename
func=/^acomp/	none	#1:func=xcomp
func=/^npadvmod/	none	#1:func=nmod:npmod
func=/^num/	none	#1:func=nummod
func=/^rcmod/	none	#1:func=acl:relcl
func=/^dobj/	none	#1:func=obj
pos=/DT/&func=/^neg/	none	#1:func=det
func=/^neg/	none	#1:func=advmod
func=/preconj/	none	#1:func=cc:preconj
func=/^quantmod/	none	#1:func=advmod
func=/^tmod/	none	#1:func=nmod:tmod
func=/^predet/	none	#1:func=det:predet
func=/^possessive/	none	#1:func=case
func=/^poss$/	none	#1:func=nmod:poss
func=/^prt/	none	#1:func=compound:prt
func=/^auxpass/	none	#1:func=aux:pass
func=/^csubjpass/	none	#1:func=csubj:pass
func=/^nsubjpass/	none	#1:func=nsubj:pass

;disambiguate nn
func=/nn/&pos=/JJ/	none	#1:func=amod
func=/nn/&pos=/DT/	none	#1:func=det

; Logan's try of flat (example: actor Bob A B C D Smith)
; First deal with person entities based on 'person' in the morph field
; step 1	let Bob dominate all ABCD
; non-sentence-initial
pos!=/N?NP.*/;pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&morph=/(.*person.*)/	#1.#2.*#3.*#4;#4>#2;#4>#3	#2>#3;#3:func=flat
; sentence-initial
pos=/N?NP.*/&func=/nn/&position=/first/;pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&morph=/(.*person.*)/	#1.*#2.*#3;#3>#1;#3>#2	#1>#2;#2:func=flat

; step 2	let anything previously dominated by Smith now by Bob
pos=/.*/;pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&morph=/(.*person.*)/	#1.*#2.*#3;#3>#1;#3>#2	#2>#1

; step 3 let Bob dominate Smith and receive func, morph information from Smith
; head has parent
func=/.*/;pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&func=/(.*)/&morph=/(.*person.*)/	#1.*#2.*#3;#3>#2;#1>#3	#1>#2;#2>#3;#2:func=$1;#2:morph=$2;#3:func=flat;#3:morph=_
; head has no parent
pos=/N?NP.*/&func=/nn/;pos=/N?NP.*/&func=/(root)/&morph=/(.*person.*)/	#1.*#2;#2>#1	#1>#2;#1:func=$1;#1:morph=$1;#1:head=0;#2:func=flat;#2:morph=_

; step 4 move head of flat fountain to actor if the entity is a person, morph and func info also moved to actor
func=/nn/;pos=/N?NP.*/&morph=/(.*person.*)/&func=/(.*)/&head=/(.*)/;func=/flat/	#1.#2.*#3;#2>#1;#2>#3	#1>#2;#1>#3;#1:morph=$1;#1:func=$2;#1:head=$3;#2:func=flat;#2:morph=_

; step 4.5: add old flat analysis for non-person
func=/nn/;func=/nn/;text=/.*/	#1.#2;#3>#2;#3>#1	#1>#2;#2:func=flat
pos=/N?NP.*|FW/&func=/nn/;pos=/N?NP.*|FW/&func=/(.*)/;text=/.*/	#2>#1;#3>#2	#1>#2;#2:func=flat;#3>#1;#1:func=$1
pos=/N?NP.*|FW/&func=/nn/;pos=/N?NP.*|FW/&func=/(root)/	#2>#1	#1>#2;#2:func=flat;#1:head=0;#1:func=$1

; step 5 cleaning: whatever dominated by flat will be by its parent
; precedence shouldn't matter for this step, since flat never dominates anything
;func=/.*/;func=/.*/;func=/flat/	#1.*#2.*#3;#3>#1;#2>#3	#2>#1
func=/.*/;func=/.*/;func=/flat/	#3>#1;#2>#3	#2>#1

; all rest nn become compound
func=/nn/	none	#1:func=compound


;to-infinitive
text=/^[Tt]o$/&func=/aux/	none	#1:func=mark

;adverbial clause modifying a nominal
pos=/^(N.*|P.*)$/;pos=/[NV].*/&func=/advcl/	#1>#2	#2:func=acl

;clauses (handling vmod)
pos=/^[NJ].*$/;pos=/^V[VBH]$|V.N|V.G/&func=/vmod/	#1>#2	#2:func=acl
pos=/^V.*/;pos=/^V.[GN]$/&func=/vmod/	#1>#2	#2:func=advcl
pos=/^V.*/;pos=/^V.$/&func=/vmod/	#1>#2	#2:func=advcl
pos=/^V.*/;func=/vmod/;func=/cop/	#1>#2>#3	#2:func=advcl

;reverse fixed
func=/^mwe$/;func=/(.*)/;func=/.*/	#3>#2>#1;#1.1,3#2	#3>#1;#1>#2;#2:func=fixed;#1:func=$1
func=/^mwe$/	none	#1:func=fixed

;handle copula
;protect expletive existential first
func=/expl/;lemma=/be/	#2>#1	#2:morph=EXIST
;now convert copula cases
func=/nsubj|csubj/;lemma=/be/&morph!=/EXIST/&func=/(ccomp|parataxis|advcl|rcmod)/;func=/prep|pcomp/;func=/pobj/;text=/.*/	#2>#1;#2>#3>#4;#5>#2	#4>#1;#4>#2;#4>#3;#3:func=case;#4:func=$1;#2:func=cop;#5>#4
func=/nsubj|csubj/;lemma=/be/&morph!=/EXIST/&func=/root/;func=/prep|pcomp/;func=/pobj/	#2>#1;#2>#3>#4	#4>#1;#4>#2;#4>#3;#3:func=case;#2:func=cop;#4:func=root;#4:head=0
;restore existential case
morph=/EXIST/	none	#1:morph=_

;TODO: handle copula without lemma (for corpora without gold lemmas)

;prepositional phrases
;take care of adnominal pcomp, should become acl (e.g. "mirrors for correcting your pose")
pos=/^N.*|FW|DT/;func=/prep/;func=/pcomp/	#1>#2>#3	#1>#3;#3>#2;#2:func=mark;#3:func=acl
;simple
func=/.*/;func=/^prep$/;func=/pobj/	#1>#2>#3	#3>#2;#2:func=case;#3:func=nmod;#1>#3
;pcomp without mark
func=/.*/;func=/^prep$/;func=/pcomp/	#1>#2>#3>#4	#3>#2;#2:func=_temp;#3:func=ncmod;#1>#3
;pcomp with mark
func=/.*/;func=/^prep$/;func=/pcomp/;func=/mark/	#1>#2>#3>#4	#3>#2;#2:func=case;#3:func=ncmod;#1>#3
func=/_temp/	none	#1:func=mark
;coordinated pobj
func=/.*/;func=/conj/;func=/pobj/	#1>#2>#3	#2:func=case;#3>#2;#1>#3;#3:func=conj


;reverse conjunction 
func=/.*/;func=/^cc$/;func=/^conj$/	#1>#2;#1>#3	#3>#2

;fix double coordination results in cc attaching to crossed third conjunct
func=/.*/;func=/^cc$/;func=/^conj$/;func=/^conj$/	#1.*#2.*#3.*#4;#1>#3;#1>#4;#4>#2	#3>#2


;prep for verbal predicate with pcomp
pos=/^V.*|^J.*/;func=/prep/;func=/pcomp/	#1>#2>#3	#1>#3;#3>#2;#2:func=mark;#3:func=advcl


;handle obj & xcomp (instead of nsubj of subclause in SD)
func=/.*/;func=/nsubj/;func=/xcomp/	#1>#3;#3>#2	#1>#2;#2:func=obj


;Promote remaining preps, which probably don't have a pobj, to nmod (which subsequently goes to obl if necessary)
func=/.*/;func=/^prep$/	#1>#2	#2:func=nmod


;handle nmod of predicates (should be obl)
pos=/^(V.*|J.*)$/;func=/nmod/	#1>#2	#2:func=obl

;complex numbers analyzed as compound
func=/^number/	none	#1:func=compound

;universal POS tags
cpos=/JJ[RS]?/	none	#1:pos=ADJ
cpos=/WRB/&func=/advmod|mark|obl/	none	#1:pos=SCONJ
cpos=/RB[RS]?/&lemma!=/n.?t/	none	#1:pos=ADV
cpos=/RB/&lemma=/n.?t/	none	#1:pos=PART
cpos=/UH/	none	#1:pos=INTJ
cpos=/CC/	none	#1:pos=CCONJ
cpos=/CD/	none	#1:pos=NUM
cpos=/NNS?/	none	#1:pos=NOUN
text=/%/	none	#1:pos=SYM
cpos=/NNPS?/	none	#1:pos=PROPN
cpos=/V.*/	none	#1:pos=VERB
func=/.*aux.*|cop/	none	#1:pos=AUX
cpos=/IN|RP|TO/&func!=/mark/	none	#1:pos=ADP
func=/mark/	none	#1:pos=SCONJ
func=/(pre)?det/	none	#1:pos=DET
cpos=/POS|TO/&func!=/case/	none	#1:pos=PART
cpos=/PRP\\$?|WP\\$?|EX|W?DT/&func!=/det/	none	#1:pos=PRON
func=/punct/	none	#1:pos=PUNCT
cpos=/FW|LS/	none	#1:pos=X

;clear morph
morph=/.*/	none	#1:morph=_

`;
export const ENG_SENT_TYPE_INI = String.raw`;;;Configuration file to add rough sentence type to English sentences based on GUM schema
;WH:: what/who/how verbed?
func=/root|ROOT/;xpos=/WP|WRB/;text=/\\?/&position=/last/	#1>#2;#1.1,50#3	#S:s_type=wh;last
;WH:: how x is y?
func=/root|ROOT/;xpos=/WP|WRB|WDT/;xpos=/^N.*|^J.*/;text=/\\?/&position=/last/	#1>#3>#2;#1.1,50#4	#S:s_type=wh;last
;WH:: how x does y verb z?
func=/root|ROOT/;func=/obj|nsubj/;xpos=/WP|WRB|WDT/;xpos=/^N.*|^J.*/;text=/\\?/&position=/last/	#1>#2>#4>#3;#1.1,50#5	#S:s_type=wh;last
;Q:: other sent with question mark
func=/root|ROOT/;text=/\\?/&position=/last/	#1.1,50#2	#S:s_type=q;last
;SUB:: x might verb (has subj and modal verb)
func=/root|ROOT/;func=/nsubj/;xpos=/MD/&text!=/.*ll/	#1>#2;#1>#3	#S:s_type=sub;last
;DECL:: x might verb (has subj and verb or cop)
func=/root|ROOT/&xpos=/V.*/;func=/nsubj/	#1>#2	#S:s_type=decl;last
func=/root|ROOT/;func=/nsubj/;func=/cop/	#1>#2;#1>#3	#S:s_type=decl;last
;INF:: has base form verb with 'to'
func=/root|ROOT/&xpos=/^V.$/;xpos=/TO/	#1>#2	#S:s_type=inf;last
;IMP:: has base form verb, and no subject (otherwise decl rule should have matched)
func=/root|ROOT/&xpos=/^V.$/	none	#S:s_type=imp;last
;GER:: has gerund form verb, and no subject (otherwise decl rule should have matched)
func=/root|ROOT/&xpos=/^V.G$/	none	#S:s_type=ger;last
;INTJ:: has interjection as root
func=/root|ROOT/&xpos=/^UH$/	none	#S:s_type=intj;last
;FRAG::
xpos=/N.*|IN|PR?P/&func=/root|ROOT/	none	#S:s_type=frag;last
text=/.*/	none	#S:s_type=decl;last
`;
export const ENG_ENHANCE_INI = String.raw`# eng_enhance.ini
# USAGE: 
# > python depedit.py -c eng_enhance.ini INFILE.conllu

# set a variable for transitive verbal lemmas that trigger subject control for "xcomp"
{$subject_control}=/promise|threaten|offer|propose/

# erase any existing enhanced dependencies in the input except for ellipsis nodes
num!=/.*\\..*/&head2=/.*/	none	#1:head2=;#1:edep=

# store desired lemma form for "conj", "case" and "mark" augmentation
# use lowercase of lemma by default
lemma=/(.*)/	none	#1:storage2=$1L
# for participles used as mark/case, use the lowercased word form, not the verbal lemma
text=/(.*)/&xpos=/VB[GN]/	none	#1:storage2=$1L
# for non-alphabetic words set to empty to avoid validation errors
text=/.*[^A-Za-z]/	none	#1:storage2=
# try known mappings for specific non-alphabetic cases
text=/[–-]+/	none	#1:storage2=to
text=/\\u002F+/	none	#1:storage2=slash
text=/\\+/	none	#1:storage2=plus
text=/-/	none	#1:storage2=minus
text=/@/	none	#1:storage2=at
text=/[Vv][Ss]\\.?/	none	#1:storage2=versus
text=/:/	none	#1:storage2=colon
text=/±/	none	#1:storage2=plus_minus
text=/à/	none	#1:storage2=a
text=/ca?\\./	none	#1:storage2=circa
text=/&/	none	#1:storage2=and
text=/n'/	none	#1:storage2=and
text=/cuz/	none	#1:storage2=because
text=/x/&func=/case/	none	#1:storage2=by

# default edep - duplicate the regular dependency
text=/.*/;func=/(.*)/	#1>#2	#1~#2;#2:edep=$1
func=/root/	none	#1:ehead=0;#1:edep=root

# annotate tokens internally to mark whether they have certain dependents
xpos=/[VN].*|JJ.?|RB.?/;func=/aux.*/	#1>#2	#1:storage+=hasaux
xpos=/[VN].*|JJ.?|RB.?/;func=/.subj.*/	#1>#2	#1:storage+=hassubj
xpos=/[VN].*|JJ.?|RB.?/;func=/cop/	#1>#2	#1:storage+=hascop
xpos=/VBN/;func=/aux:pass/	#1>#2	#1:storage+=haspass
xpos=/[NP].*/;func=/case/	#1>#2	#1:storage+=hascase

# handle augmented \case
# combo case + mark
func=/advcl/;func=/case/&storage2=/(.*)/;func=/mark/&xpos=/W.*/&storage2=/(.*)/;text=/.*/	#1>#2;#1>#3;#2.#3;#4>#1	#4~#1;#1:edep=advcl:$1_$2;#2:storage=hasdblfixed
# combo mark-fixed + mark
func=/advcl/;func=/mark/&storage2=/(.*)/;func=/fixed/&storage2=/(.*)/;func=/mark/&storage2=/(.*)/;text=/.*/	#1>#2>#3;#1>#4;#2.#3.#4;#5>#1	#5~#1;#1:edep=advcl:$1_$2_$3;#2:storage=hasdblfixed
# two and three word "fixed" and "goeswith" expressions
text=/.*/;func=/^(obl|nmod)$/;storage2=/(.*)/&func=/(case)/;func=/fixed/&storage2=/(.*)/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4;#3>#5;#4.#5	#1~#2;#2:edep=$1:$2_$4_$5;#3:storage=hasdblfixed
text=/.*/;func=/^(obl|nmod)$/;storage2=/(.*)/&func=/(case)/&storage!=/hasdblfixed/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4	#1~#2;#2:edep=$1:$2_$4;#3:storage=hasfixed
text=/.*/;func=/^(obl|nmod)$/;storage2=/(.*)/&func=/(case)/&storage!=/hasdblfixed/;func=/goeswith/&storage2=/(.*)/	#1>#2>#3>#4	#1~#2;#2:edep=$1:$2$4;#3:storage=hasgoeswith
# all other regular cases - and ruling out genitive 's as the augmentation (xpos=POS)
text=/.*/;func=/^(obl|nmod)$/;storage2=/(.*)/&func=/(case)/&xpos!=/POS/&storage!=/hasfixed/	#1>#2>#3	#1~#2;#2:edep=$1:$2;#3:storage=
text=/.*/;func=/^(obl|nmod)$/;storage2=/(.*)/&func=/(case)/&xpos!=/POS/&storage!=/hasfixed/;func=/conj/&storage!=/.*hascase.*/	#1>#2>#3;#2>#4	#1~#4;#4:edep=$1:$2
# handle double case, e.g. obl:out_of for "out of X", rather than obl:out
text=/.*/;func=/^(obl|nmod)$/;func=/case/&xpos!=/POS/&storage2=/(.*)/;func=/case/&xpos!=/POS/&storage2=/(.*)/	#3.*#4;#1>#2;#2>#3;#2>#4	#1~#2;#2:edep=$1:$2_$3;#3:storage=;#4:storage=
# handle augmented "mark"
# two and three word "fixed" expressions
text=/.*/;func=/^(advcl|acl)$/;storage2=/(.*)/&func=/(mark)/;func=/fixed/&storage2=/(.*)/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4;#3>#5;#4.#5	#1~#2;#2:edep=$1:$2_$4_$5;#3:storage=hasdblfixed
text=/.*/;func=/^(advcl|acl)$/;storage2=/(.*)/&func=/(mark)/&storage!=/hasdblfixed/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4	#1~#2;#2:edep=$1:$2_$4;#3:storage=hasfixed
text=/.*/;func=/^(advcl|acl)$/;storage2=/(.*)/&func=/(mark)/&storage!=/hasdblfixed/;func=/goeswith/&storage2=/(.*)/	#1>#2>#3>#4	#1~#2;#2:edep=$1:$2$4;#3:storage=hasgoeswith
# all other regular cases - and ruling out genitive 's as the augmentation (xpos=POS)
text=/.*/;func=/^(advcl|acl)$/;storage2=/(.*)/&func=/(mark)/&xpos!=/POS/&storage!=/hasfixed/	#1>#2>#3	#1~#2;#2:edep=$1:$2;#3:storage=
text=/.*/;func=/^(advcl|acl)$/;storage2=/(.*)/&func=/(mark)/&xpos!=/POS/&storage!=/hasfixed/;func=/conj/&storage!=/.*hascase.*/	#1>#2>#3;#2>#4	#1~#4;#4:edep=$1:$2
# handle double mark, e.g. acl:for_to in "for X to Y", rather than acl:for
text=/.*/;func=/^(advcl|acl)$/;func=/mark/&xpos!=/POS/&storage2=/(.*)/;func=/mark/&xpos!=/POS/&storage2=/(.*)/	#3.*#4;#1>#2;#2>#3;#2>#4	#1~#2;#2:edep=$1:$2_$3;#3:storage=;#4:storage=
# augment "conj" with "cc" lemma
# two and three word "fixed" expressions
text=/.*/;func=/^(conj)$/;storage2=/(.*)/&func=/(cc)/;func=/fixed/&storage2=/(.*)/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4;#3>#5;#4.#5	#1~#2;#2:edep=$1:$2_$4_$5;#3:storage=hasdblfixed
text=/.*/;func=/^(conj)$/;storage2=/(.*)/&func=/(cc)/&storage!=/hasdblfixed/;func=/fixed/&storage2=/(.*)/	#1>#2>#3>#4	#1~#2;#2:edep=$1:$2_$4;#3:storage=hasfixed
# all other regular cases
text=/.*/;func=/^(conj)$/;storage2=/(.*)/&func=/(cc)/&storage!=/hasfixed/	#1>#2>#3	#1~#2;#2:edep=$1:$2;#3:storage=
# multiple conj
text=/.*/;func=/conj/&edep=/.*conj:([^|]+).*/;func=/conj/&edep!=/.*conj:.*/	#1>#2;#1>#3;#3.*#2	#1~#3;#3:edep=conj:$1

# xcomp
# "obj" + "xcomp" subject sharing - object control (X forced Y to Z := Z ~>xsubj Y)
lemma!=/{$subject_control}/;func=/obj/;func=/xcomp/	#1>#2;#1>#3	#3~#2;#2:edep=nsubj:xsubj;#3:storage+=xobj
lemma!=/{$subject_control}/;func=/ccomp/;func=/xcomp/	#1>#2;#1>#3	#3~#2;#2:edep=csubj:xsubj;#3:storage+=xobj
# subject control with transitive verb (X promised Y to Z := Z ~>xsubj X)
lemma=/{$subject_control}/;func=/obj|ccomp/;func=/xcomp/;func=/(.subj).*/	#1>#2;#1>#3;#1>#4	#3~#4;#4:edep=$1:xsubj;#3:storage+=xobj
# coordinate of "xcomp" with xsubj: copy xsubj dependency (X want to A and B)
text=/.*/;func=/xcomp/;func=/(.subj).*/;func=/conj/&storage!=/.*xsubj.*/	#1>#2;#1>#3;#2>#4	#4~#3;#3:edep=$1:xsubj;#4:storage+=xsubj
# repeat in case the coordinate has its own coordinate (X wanted to A and B or C)
text=/.*/;func=/xcomp/;func=/(.subj).*/;func=/conj/&storage!=/.*xsubj.*/	#1>#2;#1>#3;#2>#4	#4~#3;#3:edep=$1:xsubj;#4:storage+=xsubj

# intransitive subject control
xpos=/V.*|JJ.?|RB.?/;func=/(.subj).*/;func=/xcomp/&storage!=/.*xobj.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1:xsubj
# remaining cases where xcomp has conj
func=/xcomp/;edep=/(.subj).*/;func=/conj/	#1>#3;#1~#2	#3~#2;#2:edep=$1:xsubj
# percolated subject control when xcomp has xcomp (X decided to try to cook)
xpos=/V.*|JJ.?|RB.?/;func=/(.subj).*/;func=/xcomp/&storage!=/.*xobj.*/;func=/xcomp/	#1>#2;#1>#3>#4	#4~#2;#2:edep=$1:xsubj
# double percolated subject control (X wanted to decide to try to cook)
xpos=/V.*|JJ.?|RB.?/;func=/(.subj).*/;func=/xcomp/&storage!=/.*xobj.*/;func=/xcomp/;func=/xcomp/	#1>#2;#1>#3>#4>#5	#5~#2;#2:edep=$1:xsubj
# secondary xcomp of xcomp object "X makes Y appear Z"
text=/.*/;func=/obj/;func=/xcomp/&storage!=/.*xobj.*/;func=/xcomp/	#1>#2;#1>#3;#3>#4	#4~#2;#2:edep=nsubj:xsubj
text=/.*/;func=/ccomp/;func=/xcomp/storage!=/.*xobj.*/;func=/xcomp/	#1>#2;#1>#3;#3>#4	#4~#2;#2:edep=csubj:xsubj
# subject predicate's coordinate predicate has xcomp (X wanted to A but decided to *B*)
func=/(.subj).*/;text=/.*/;func=/conj/&storage!=/.*hassubj.*/;func=/xcomp/&storage!=/.*xobj.*/	#2>#1;#2>#3>#4	#4~#1;#1:edep=$1:xsubj

# coord general - duplicate all resulting deps and edeps on "conj"; note that "parataxis" is not carried over
text=/.*/;func=/(.*)/&func!=/parataxis/;func=/conj/	#1>#2>#3	#1~#3;#3:edep=$1
text=/.*/;edep=/(.*)/&edep!=/conj.*/&func!=/parataxis/;func=/conj|root/	#1~#2;#2>#3	#1~#3;#3:edep=$1

# coord subjects
text=/.*/;func=/(.subj.*)/;func=/conj/	#1>#2>#3	#1~#3;#3:edep=$1
# coord xsubj - note use of the special edom property to copy ehead AND matching edeprel specifically
text=/.*/;edom=/(.*subj:xsubj)/;func=/conj/	#1~#2;#2>#3	#3:edom=$1

# coord two preds with one aux (X could A or B)
xpos=/V.*/;func=/(aux.*)/;xpos=/V.[GN]?/&func=/conj/&storage!=/.*hasaux.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1

# coord two preds with one subj (X came and went); special handling for copula cases (X is rich and famouse) including mixtures (X is rich but works hard)
xpos=/V.*/;func=/(.subj.*)/;xpos=/V.*/&func=/conj/&storage!=/.*hassubj.*/&storage!=/.*haspass.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1
xpos=/V.*/;func=/(.subj).*/;xpos=/V.*/&func=/conj/&storage!=/.*hassubj.*/&storage=/.*haspass.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1:pass
xpos=/[NJR].*/&storage=/.*hascop.*/;func=/(.subj.*)/;xpos=/[VNJR].*/&func=/conj/&storage!=/.*hassubj.*/&storage!=/.*haspass.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1
xpos=/N.*/&storage=/.*hascop.*/;func=/(.subj).*/;xpos=/V.*/&func=/conj/&storage!=/.*hassubj.*/&storage=/.*haspass.*/	#1>#2;#1>#3	#3~#2;#2:edep=$1:pass

# coord verbs with single obj (X cooks and eats the food)
xpos=/V.*/;xpos=/V.*/&func=/conj/;func=/(i?obj|ccomp)/	#1.*#2.*#3;#1>#3;#1>#2	#2~#3;#3:edep=$1
# coord obj (X eats A and B)
text=/.*/;func=/(i?obj|ccomp)/;func=/conj/	#1>#2>#3	#1~#3;#3:edep=$1

# relative clauses
# clear edeps for bearer of "ref" edep - it may ONLY carry the "ref" edep
text=/.*/;func=/acl:relcl/;func=/(.*)/&xpos=/^W(DT|P.?)$/	#1>#2>#3	#3:edep=
# normal relative
text=/.*/;func=/acl:relcl/;func=/(.*)/&xpos=/^W(DT|P.?)$/	#1>#2>#3	#1~#3;#3:edep=ref;#2~#1;#1:edep=$1
# relative in embedded PP ("to which")
text=/.*/;func=/acl:relcl/;func=/(nmod|obl)/&xpos=/^W(DT|P.?)$/;func=/case/&lemma=/(.*)/	#1>#2>#3>#4	#2~#1;#1:edep=$1:$3
# coordinate matrix NP with embedded PP ([X and Y] to which Z)
text=/.*/;func=/acl:relcl/;func=/(nmod|obl)/&xpos=/^W(DT|P.?)$/;func=/case/&lemma=/(.*)/;func=/conj/&storage!=/.*hascase.*/	#1>#2>#3>#4;#1>#5;#5.*#3	#2~#5;#5:edep=$1:$3
# relative pronoun in PP embedded in NP ("... most of whom")
text=/.*/;func=/acl:relcl/;func=/.*/;func=/(nmod)/&xpos=/^W(DT|P.?)$/;func=/case/&lemma=/(.*)/	#1>#2>#3>#4>#5	#4:edep=
text=/.*/;func=/acl:relcl/;func=/.*/;func=/(nmod)/&xpos=/^W(DT|P.?)$/;func=/case/&lemma=/(.*)/	#1>#2>#3>#4>#5	#1~#4;#4:edep=ref;#3~#1;#1:edep=$1:$3
# exception to previous: prevent cycle when acl:relcl head has a coordinate predicate
func=/(.*)/;func=/acl:relcl/;func=/.*/;func=/(nmod)/&xpos=/^W(DT|P.?)$/;func=/case/&lemma=/(.*)/;func=/conj/;text=/.*/	#1>#2>#3>#4>#5;#2>#6;#7>#1	#1:edep=;#7~#1;#1:edep=$1

# coord general - duplicate all resulting deps and edeps on "conj"; note that "parataxis" is not carried over
text=/.*/;func=/(.*)/&func!=/parataxis|root/;func=/conj/	#1>#2>#3	#1~#3;#3:edep=$1
#text=/.*/;edep=/(.*)/&edep!=/conj.*/&func!=/parataxis|root/;func=/conj/	#1~#2;#2>#3	#1~#3;#3:edep=$1
edom=/.*?([0-9.]+\\|\\|(nmod|obl|conj):[a-z]+).*/&edep!=/conj.*/;func=/conj/	#1>#2	#2:edom=$1

# coord unlike coordination
# compound + amod
text=/.*/;func=/compound/;func=/conj/&xpos=/J.*|V.N/&edom=/(.*?[0-9.]+\\|\\|)compound(.*)/	#1>#2>#3;#1~#3	#3:edom=$1amod$2
# amod + compound
text=/.*/;func=/amod/;func=/conj/&xpos=/NN.*/&edom=/(.*?[0-9.]+\\|\\|)amod(.*)/	#1>#2>#3;#1~#3	#3:edom=$1compound$2
# nsubj + csubj
text=/.*/;func=/nsubj/;func=/conj/&xpos=/V.G/&edom=/(.*?[0-9.]+\\|\\|)nsubj(.*)/	#1>#2>#3;#1~#3	#3:edom=$1csubj$2

# supertokens (=multiword tokens, MWTs)
# uncomment the following lines to introduce MWTs for words like "don't" to data which lacks them
#text=/^(?i)gon|wan/;text=/^(?i)na/	#1.#2	#1><#2
#text=/^(?i)dun/;text=/^(?i)no/	#1.#2	#1><#2
#text=/^(?i)out|got/;text=/^(?i)ta/	#1.#2	#1><#2
#text=/^(?i)c'?m/&misc=/.*SpaceAfter.No.*/;text=/^(?i)on/	#1.#2	#1><#2
#misc=/.*SpaceAfter.No.*/;text=/^(?i)[^A-Za-z]?(ll|d|m|ve|s)/&xpos=/VBP|MD|VHP|VBZ|VHZ/	#1.#2	#1><#2
#misc=/.*SpaceAfter.No.*/;xpos=/POS/	#1.#2	#1><#2
#misc=/.*SpaceAfter.No.*/;lemma=/n[o']?t/	#1.#2	#1><#2
`;
export const ENG_MORPH_INI = String.raw`morph=/.*/ none #1:morph=_

{$negstems}=/imposs|improb|immort|inevit|incomp|indirec|inadeq|insuff|ineff|incong|incoh|inacc|invol[iu]|infreq|inapp|indist|infin|intol|dislik|dys|dismount|disadvant|disinteg|disresp|disagr|disjoin|disprov|disinterest|discomfort|dishonest|disband|disentangl/
{$neglemmas}=/nowhere|never|nothing|none|undo|uncover|unclench|no|not|n't|ne|pas/
{$subjunctive}=/advise|ask|command|demand|desire|insist|order|prefer|propose|recommend|request|suggest|command|demand|order|proposal|recommendation|request|suggestion|advisable|best|crucial|desirable|essential|imperative|important|necessary|unthinkable|urgent|vital|adamant|anxious|determined|eager|keen/

# Fixed values from CoreNLP
xpos=/^NNP?$/&func!=/goeswith/	none	#1:morph+=Number=Sing
xpos=/^NNP?S$/&func!=/goeswith/	none	#1:morph+=Number=Plur
xpos=/^VBZ$/	none	#1:morph+=Mood=Ind|Number=Sing|Person=3|Tense=Pres|VerbForm=Fin
xpos=/^VBD$/	none	#1:morph+=VerbForm=Fin|Mood=Ind|Tense=Past
xpos=/^VBN$/	none	#1:morph+=Tense=Past|VerbForm=Part
xpos=/^VBP$/	none	#1:morph+=VerbForm=Fin|Mood=Ind|Tense=Pres
xpos=/^MD$/	none	#1:morph+=VerbForm=Fin
xpos=/^JJ$/	none	#1:morph+=Degree=Pos
xpos=/^JJR$/	none	#1:morph+=Degree=Cmp
xpos=/^JJS$/	none	#1:morph+=Degree=Sup
xpos=/^CD$/&func!=/goeswith/	none	#1:morph+=NumType=Card
text=/^(?i)am$/&xpos=/^VBP$/	none	#1:morph+=VerbForm=Fin|Mood=Ind|Tense=Pres|Person=1|Number=Sing
text=/^(?i)was$/&xpos=/^VBD$/	none	#1:morph+=VerbForm=Fin|Mood=Ind|Tense=Past|Number=Sing
text=/^(?i)i$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=1|PronType=Prs|Case=Nom
text=/^(?i)you$/&xpos=/^PRP$/	none	#1:morph+=Person=2|PronType=Prs
text=/^(?i)he$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Masc|PronType=Prs|Case=Nom
text=/^(?i)she$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Fem|PronType=Prs|Case=Nom
text=/^(?i)it$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Neut|PronType=Prs
text=/^(?i)we$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=1|PronType=Prs|Case=Nom
text=/^(?i)they$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=3|PronType=Prs|Case=Nom
text=/^(?i)me$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=1|PronType=Prs|Case=Acc
text=/^(?i)h?'?im$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Masc|PronType=Prs|Case=Acc
text=/^(?i)her$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Fem|PronType=Prs|Case=Acc
text=/^(?i)['u]s$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=1|PronType=Prs|Case=Acc
text=/^(?i)(th)?'?em$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=3|PronType=Prs|Case=Acc
text=/^(?i)my|mine$/&xpos=/^PRP\\$?$/	none	#1:morph+=Number=Sing|Person=1|Poss=Yes|PronType=Prs
text=/^(?i)yours?$/&xpos=/^PRP\\$?$/	none	#1:morph+=Person=2|Poss=Yes|PronType=Prs
text=/^(?i)his$/&xpos=/^PRP\\$?$/	none	#1:morph+=Number=Sing|Person=3|Gender=Masc|Poss=Yes|PronType=Prs
text=/^(?i)her$/&xpos=/^PRP\\$$/	none	#1:morph+=Number=Sing|Person=3|Gender=Fem|Poss=Yes|PronType=Prs
text=/^(?i)hers$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Fem|Poss=Yes|PronType=Prs
text=/^(?i)its$/&xpos=/^PRP\\$$/	none	#1:morph+=Number=Sing|Person=3|Gender=Neut|Poss=Yes|PronType=Prs
text=/^(?i)ours?$/&xpos=/^PRP\\$?$/	none	#1:morph+=Number=Plur|Person=1|Poss=Yes|PronType=Prs
text=/^(?i)theirs?$/&xpos=/^PRP\\$?$/	none	#1:morph+=Number=Plur|Person=3|Poss=Yes|PronType=Prs
text=/^(?i)myself$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=1|PronType=Prs
text=/^(?i)yourself$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=2|PronType=Prs
text=/^(?i)himself$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Masc|PronType=Prs
text=/^(?i)herself$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Fem|PronType=Prs
text=/^(?i)itself$/&xpos=/^PRP$/	none	#1:morph+=Number=Sing|Person=3|Gender=Neut|PronType=Prs
text=/^(?i)ourselves$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=1|PronType=Prs
text=/^(?i)yourselves$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=2|PronType=Prs
text=/^(?i)themselves$/&xpos=/^PRP$/	none	#1:morph+=Number=Plur|Person=3|PronType=Prs
text=/^(?i)the$/&xpos=/^DT$/	none	#1:morph+=Definite=Def|PronType=Art
text=/^(?i)an?$/&xpos=/^DT$/	none	#1:morph+=Definite=Ind|PronType=Art
text=/^(?i)(this|that)$/&xpos=/^DT$/	none	#1:morph+=PronType=Dem|Number=Sing
text=/^(?i)th[oe]se$/&xpos=/^DT$/	none	#1:morph+=PronType=Dem|Number=Plur
text=/^(?i)(t?here|then)$/&xpos=/^RB$/	none	#1:morph+=PronType=Dem
text=/^(?i)whose$/&xpos=/^WP\\$$/	none	#1:morph+=Poss=Yes
xpos=/^RB$/&lemma!=/^(thus|even|as|not|over|very|yet|only|namely|already|also|once|twice|thrice|then|t?here|about|out|now|pretty|quite|rather|some(what|where|how|time)s?|maybe|always|never|just|merely|any(way|how|where|time)s?|likewise|so|however|either)$/	none	#1:morph+=Degree=Pos
xpos=/^RBR$/	none	#1:morph+=Degree=Cmp
xpos=/^RBS$/	none	#1:morph+=Degree=Sup

# Fractions
lemma=/½|¼|⅓|[0-9]*\\.[0-9]+|half|third|quarter|fifth|sixth|seventh|eighth|nineth|tenth|hundredth|thousandth|millionth|billionth/&xpos=/CD|NNS?/	none	#1:morph+=NumType=Frac
# Ordinals
lemma=/^(first|second|third|fourth|fifth|sixth|seventh|eigth|ninth|tenth|([0-9,.]+(th|st|nd|rd)))$/&xpos=/JJ|RB/	none	#1:morph+=NumType=Ord
lemma=/^(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eigth|Ninth|Tenth|([0-9,.]+(th|st|nd|rd)))$/&xpos=/NNP/&upos=/ADJ/	none	#1:morph+=NumType=Ord
# Multiplicative adverbs
lemma=/^(once|twice|thrice)$/&xpos=/RB/	none	#1:morph+=NumType=Mult
lemma=/^(Once|Twice|Thrice)$/&xpos=/NNP/&upos=/ADV/	none	#1:morph+=NumType=Mult
# Reflexives
lemma=/^(myself|yourself|himself|herself|itself|ourselves|yourselves|themselves)$/&func!=/.*npmod/	none	#1:morph+=Reflex=Yes;#1:morph+=Case=Acc

# Case
# Initially assume all pronouns are non-subjects
xpos=/^PRP$/&lemma!=/^(myself|yourself|himself|herself|itself|ourselves|yourselves|themselves|one)$/	none	#1:morph+=Case=Acc
# Catch clear nominatives
xpos=/^PRP$/&text=/^(?i)(I|we|they|he|she)$/	none	#1:morph+=Case=Nom
xpos=/^PRP$/&func=/nsubj.*/&lemma!=/one/	none	#1:morph+=Case=Nom
# Coordination
func=/nsubj.*/;xpos=/^PRP$/&text=/^(?i)(it|you)$/&func=/conj/	#1>#2	#2:morph+=Case=Nom
# Expletives
func=/expl/;func=/.*/;func=/csubj/	#2>#1;#2>#3	#1:morph+=Case=Nom

# Nominal number
# Assume singular you
lemma=/you/&xpos=/PRP/	none	#1:morph+=Number=Sing
# "you guys", "you all" and similar
xpos=/NNS/;xpos=/PRP/&lemma=/you/&func=/dep/	#1>#2;#2.*#1	#2:morph+=Number=Plur
xpos=/NNS/&func=/nsubj.*/;xpos=/PRP/&lemma=/you/&func=/dep/	#1>#2;#2.*#1	#2:morph+=Case=Nom
lemma=/you/;lemma=/all/	#1>#2	#1:morph+=Number=Plur
xpos=/V.*/;lemma=/you/;lemma=/all/	#1>#2;#1>#3;#2.*#3	#2:morph+=Number=Plur
# Multiple addressees
lemma=/you/;#S:addressee=/.*,.*/	#2>#1	#1:morph+=Number=Plur

# Relatives
# Assume wh pronuns are interrogative
xpos=/W.*/&lemma!=/that/	none	#1:morph+=PronType=Int
# Standard relative
xpos=/W.*/;func=/acl:relcl/	#2>#1;#1.*#2	#1:morph+=PronType=Rel
# Free relative
xpos=/W.*/;func=/acl:relcl/	#1>#2	#1:morph+=PronType=Rel
# Possessive 'whose' relative
xpos=/WP\\$/&func=/nmod:poss/;func=/acl:relcl/;func=/.*/	#2>#3>#1;#1.*#2	#1:morph+=PronType=Rel

# Subjunctive mood
xpos=/VB/;xpos=/MD/	#1>#2	#1:storage=not_subjv
xpos=/.*/;xpos=/VB/&lemma=/be/&func=/aux.*|cop/;xpos=/MD/	#1>#2;#1>#3	#2:storage=not_subjv
xpos=/VB/;lemma=/whether/	#1>#2	#1:storage=not_subjv
; Note we are temporarily changing POS of subjunctives to VBP, so that they get Person morphology
lemma=/^({$subjunctive})$/;func=/ccomp/&lemma!=/be/&xpos=/VB/&storage!=/not_subjv/	#1.*#2;#1>#2	#2:morph+=Mood=Sub;#2:morph+=Tense=Pres;#2:morph+=VerbForm=Fin;#2:xpos=VBP
lemma=/^({$subjunctive})$/;func=/ccomp/;text=/be/&xpos=/VB/&storage!=/not_subjv/	#1.*#2;#1>#2>#3	#3:morph+=Mood=Sub;#3:morph+=Tense=Pres;#3:morph+=VerbForm=Fin;#3:xpos=VBP
lemma=/^({$subjunctive})$/;func=/acl/;text=/be/&xpos=/VB/&storage!=/not_subjv/;lemma=/that/&func=/mark/	#1.*#2;#1>#2;#2>#3;#2>#4	#3:morph+=Mood=Sub;#3:morph+=Tense=Pres;#3:morph+=VerbForm=Fin;#3:xpos=VBP

# Verb person and number
xpos=/VB.*/;func=/.*subj.*/	#1>#2	#1:storage=hassubj
# Assume 3rd person
xpos=/V.[PZD]/	none	#1:morph+=Person=3|Number=Sing
morph=/.*Plur.*/;func=/acl:relcl/&xpos=/V.[PZD]/;xpos=/WDT/&func=/[cn]subj.*/	#1>#2>#3	#2:morph+=Number=Plur|Person=3
xpos=/V.[PZD]/;func=/[cn]subj.*/&morph=/.*Number.Plur.*/	#1>#2	#1:morph+=Number=Plur
# Plurality through coordination
xpos=/V.[PZD]/;func=/[cn]subj.*/;func=/conj/	#1>#2>#3	#1:morph+=Number=Plur
xpos=/V.*/;xpos=/V.[PZD]/&func=/aux.*|cop/;func=/[cn]subj.*/;func=/conj/	#1>#2;#1>#3>#4	#2:morph+=Number=Plur
# Copy person from a person-marked subject
xpos=/V.[PZD]/;func=/[cn]subj.*/&morph=/.*Person.([0-9]).*/	#1>#2	#1:morph+=Person=$1
xpos=/V.[PZD]/;func=/[cn]subj.*/;func=/conj/&morph=/.*Person.([0-9]).*/	#1>#2>#3	#1:morph+=Number=Plur|Person=$1
xpos=/V.[PZD]/&func=/cop|aux.*/;func=/[cn]subj.*/&morph=/.*Number.Plur.*/;text=/.*/	#3>#2;#3>#1	#1:morph+=Number=Plur
xpos=/V.[PZD]/&func=/cop|aux.*/;func=/[cn]subj.*/&morph=/.*Person.([0-9]).*/;text=/.*/	#3>#2;#3>#1	#1:morph+=Person=$1
xpos=/VBZ/	none	#1:morph+=Number=Sing|Person=3
# Modal person
xpos=/MD/;func=/.subj/&xpos=/NNP?/	#1>#2	#1:morph+=Person=3;#1:morph+=Number=Sing
xpos=/MD/;func=/.subj/&xpos=/NNP?S/	#1>#2	#1:morph+=Person=3;#1:morph+=Number=Plur
xpos=/MD/;func=/.subj/&xpos=/NNP?/;xpos=/VB/	#3>#2;#3>#1	#1:morph+=Person=3;#1:morph+=Number=Sing
xpos=/MD/;func=/.subj/&xpos=/NNP?S/;xpos=/VB/	#3>#2;#3>#1	#1:morph+=Person=3;#1:morph+=Number=Plur
xpos=/MD/;func=/.subj/&morph=/.*Number.(Sing|Plur).*Person.([0-9])/	#1>#2	#1:morph+=Person=$2;#1:morph+=Number=$1
xpos=/MD/;func=/.subj/&morph=/.*Number.(Sing|Plur).*Person.([0-9])/;xpos=/VB/	#3>#2;#3>#1	#1:morph+=Person=$2;#1:morph+=Number=$1
xpos=/MD/&morph=/.*Number.(Sing|Plur).*Person.([0-9])/;xpos=/MD/&func=/conj/	#1>#2	#2:morph+=Person=$2;#2:morph+=Number=$1
# Thank you
xpos=/VBP/&text=/^(?i)(thank|hope)$/&storage!=/.*hassubj.*/	none	#1:morph+=Number=Sing;#1:morph+=Person=1
# VBP mistakenly labeled 3 Sing must be Plur
xpos=/VBP/&morph=/.*Sing.*3.*/	none	#1:morph+=Number=Plur
# Assign number to subjunctive 'be'
text=/.*/;morph=/.*Mood.Sub.*/&lemma=/be/;func=/nsubj.*/&xpos=/NNP?$/	#1>#2;#1>#3	#2:morph+=Number=Sing

# Imperative
xpos=/VB/;func=/aux.*/&xpos=/VBP/	#1>#2	#1:storage+=hasfinaux
xpos=/VB/;func=/mark/&xpos=/TO/	#1>#2	#1:storage+=hasto
xpos=/.*/;func=/.*subj.*/;xpos=/VB/&func=/conj/	#1>#2;#1>#3	#3:storage+=hassubj
xpos=/.*/;func=/aux.*/&xpos=/VBP/;xpos=/VB/&func=/conj/	#1>#2;#1>#3	#3:storage+=hasfinaux
xpos=/VB/;func=/mark/&xpos=/TO/;xpos=/VB/&func=/conj/	#1>#2;#1>#3	#3:storage+=hasto
xpos=/VB/&storage!=/has.*/&func=/root|parataxis|ccomp/	none	#1:morph+=Mood=Imp|Person=2|VerbForm=Fin
morph=/.*Mood.Imp.*/&storage!=/.*hassubj.*/;xpos=/VB/&storage!=/has.*/&func=/conj/	#1>#2	#2:morph+=Mood=Imp|Person=2|VerbForm=Fin
xpos=/VB/&storage!=/has.*/&func=/aux/&lemma=/do/;func=/advmod/&lemma=/n.?t/	#1>#2	#1:morph+=Mood=Imp|Person=2|VerbForm=Fin
xpos=/VB/&morph!=/.*Mood.Imp.*/	none	#1:morph+=VerbForm=Inf
# Infinitive matrix clause root in non imp s_type
func=/root|parataxis|conj/&xpos=/VB/&morph=/.*Mood.Imp.*/;#S:s_type=/inf|q|wh|frag|sub|decl/	#2>#1	#1:morph+=Mood=Ind|VerbForm=Inf
morph=/(.*)Mood.[^|]+\\|?(.*)/&morph=/.*VerbForm.Inf.*/	none	#1:morph=$1$2
xpos=/VB[PZD]/&morph=/.*Number.([^|]+).*Person.([0-9]).*/;func=/conj/&storage!=/.*hassubj.*/&xpos=/VB[PZD]/	#1>#2	#2:morph+=Number=$1|Person=$2
# Subjectless question
xpos=/VBP/&morph=/.*Number.Sing.*Person.3.*/&storage!=/.*hassubj.*/;#S:s_type=/q|wh/	#2>#1	#1:morph+=Person=2
storage=/has.*/	none	#1:storage=_

# Revert subjunctive xpos to VB
morph=/.*Mood.Sub.*/	none	#1:xpos=VB;#1:morph+=VerbForm=Fin

# Gerund
xpos=/VBG/	none	#1:morph+=VerbForm=Ger
xpos=/VBG/;lemma=/be/&func=/aux/	#1>#2	#1:morph+=Tense=Pres|VerbForm=Part

# Voice
xpos=/V.*/;func=/aux:pass/	#1>#2	#1:morph+=Voice=Pass

# Abbr
text=/^(US|NASA|NATO|U\\.S\\.|USI|DH|DAB|UK|IE6|COVID-19|KPA|UNESCO|FTU|LA|VR|MLB|USA|IATA|ROS|CC|IE|OK|ABC|BBC|DSW|NBC|U\\.S|KCNA|ACPeds|US-412|WB|CBC|ICI|ISO|JSC|KKK|KSC|PHX|WHO|BART|CNRS|ELI5|FIFA|O\\.J\\.|NWSC|ROTC|BAFTA|STS-1|US-75|US-169|NEMISIS|STS-133|STS-134|STS-135|NSU|FEDERAL|ANDRILL|AS|AV|CO|CV|CW|DC|FN|GW|JK|KS|LV|MC|NB|NJ|NZ|PC|QC|RA|SC|ST|UC|VM|XP|AFP|AIM|BAK|BBF|BPA|CBS|CEI|CIS|CRA|DBE|DNA|FRS|GIS|GPL|HBO|HIV|IDD|IE9|IFN|IMU|IQA|IRC|JFK|JPL|LIS|LSD|MIT|MSN|MTV|NBA|NFL|NHS|NPP|NSW|NTU|OIR|ROS|RVS|SNY|TUL|UKB|UNC|USD|USS|WTA|XML|ADPL|AIDS|AKMA|B\\.A\\.|ARES|D\\.C\\.|DPRK|FFFF|FGCU|HECS|HTML|IOTM|IRIS|K\\.C\\.|L\\.A\\.|MASS|MMPI|OSCE|S\\.F\\.|SETI|TAOM|THEO|U\\.N\\.|UAAR|WWII|XKCD|DHBs|U\\.S\\.|BY-SA|CITIC|LIBER|M\\.Sc\\.|NCLAN|ODIHR|UNMIK|OSU|CC-BY-SA-NC|CBC\\.ca|DH+Lib|DH2017|e\\.g\\.|al\\.|etc\\.|Mr\\.|St\\.|i\\.e\\.|c\\.|b\\.|Ph\\.D\\.|Mrs\\.|d\\.|m\\.|p\\.|Dr\\.|Jr\\.|No\\.|vs\\.|div\\.|approx\\.|a\\.|Ed\\.|Mt\\.|Op\\.|ca\\.|cm\\.|Ave\\.|Cal\\.|E\\.g\\.|Feb\\.|Inc\\.|Vol\\.|a\\.m\\.|eds\\.|p\\.m\\.|M\\.Sc\\.|Mlle\\.|Prof\\.)$/	none	#1:morph+=Abbr=Yes

# Polarity
lemma=/^(?i)(({$negstems}.*)|({$neglemmas})|(no[nt]-.*))$/	none	#1:morph+=Polarity=Neg
lemma=/un.*/&xpos=/JJ.*|RB.*/&lemma!=/unique|under/	none	#1:morph+=Polarity=Neg

# NumForm
xpos=/CD/&func!=/goeswith/	none	#1:morph+=NumForm=Word
xpos=/CD/&lemma=/[0-9.,]+/&func!=/goeswith/	none	#1:morph+=NumForm=Digit
xpos=/CD/&lemma=/[XIVMCDL]+\\.?/&func!=/goeswith/	none	#1:morph+=NumForm=Roman

# NNP amod
upos=/VERB/&xpos=/NNP.*/&func=/amod/&text=/.*ing/&lemma!=/.*ing/	none	#1:morph=VerbForm=Ger
upos=/VERB/&xpos=/NNP.*/&func=/amod/&text=/.*ed/&lemma!=/.*ed/	none	#1:morph=Tense=Past|VerbForm=Part
upos=/ADJ/&xpos=/NNP.*/&func=/amod/&text=/.*er/&lemma!=/.*er/	none	#1:morph=Degree=Cmp
xpos=/NNP.*/&upos=/^ADJ$/&morph!=/.*Degree.*/	none	#1:morph=Degree=Pos
`;

export function createStanfordToUD(): DepEditEngine {
  const e = new DepEditEngine();
  e.loadIniString(STAN2UNI_INI);
  return e;
}
export function createSentenceTyper(): DepEditEngine {
  const e = new DepEditEngine();
  e.loadIniString(ENG_SENT_TYPE_INI);
  return e;
}
export function createEnglishEnhancer(): DepEditEngine {
  const e = new DepEditEngine();
  e.loadIniString(ENG_ENHANCE_INI);
  return e;
}
export function createMorphEnhancer(): DepEditEngine {
  const e = new DepEditEngine();
  e.loadIniString(ENG_MORPH_INI);
  return e;
}

export function convertStanfordToUD(conllu: string): string {
  return createStanfordToUD().process(conllu);
}
export function annotateSentenceType(conllu: string): string {
  return createSentenceTyper().process(conllu);
}
export function enhanceEnglish(conllu: string): string {
  return createEnglishEnhancer().process(conllu);
}
export function applyMorphology(conllu: string): string {
  return createMorphEnhancer().process(conllu);
}
export function fullEnglishPipeline(conllu: string): string {
  let out = convertStanfordToUD(conllu);
  out = applyMorphology(out);
  out = annotateSentenceType(out);
  out = enhanceEnglish(out);
  return out;
}
